import _ from "lodash";

export default function updateUserFactory(analyticsClient) {
  return function updateUser({ message = {} }, { ship = {}, hull = {}, ignoreFilters = false }) {
    const { user = {}, segments = [], events = [] } = message;
    const account = message.account || user.account;

    // Empty payload ?
    if (!user.id || !ship.id) {
      return false;
    }

    const asUser = hull.asUser(_.pick(user, ["email", "id", "external_id"]));

    // Custom properties to be synchronized
    const {
      synchronized_account_properties = [],
      synchronized_properties = [],
      synchronized_segments = [],
      forward_events = false,
      send_events = []
    } = ship.private_settings || {};

    // Build traits that will be sent to Segment
    // Use hull_segments by default
    const traits = { hull_segments: _.map(segments, "name") };
    if (synchronized_properties.length > 0) {
      synchronized_properties.map((prop) => {
        traits[prop.replace(/^traits_/, "").replace("/", "_")] = user[prop];
        return true;
      });
    }

    // Configure Analytics.js with write key
    // Ignore if write_key is not present
    const { write_key, handle_groups, handle_accounts, public_id_field, public_account_id_field } = ship.settings || {};
    if (!write_key) {
      asUser.logger.info("outgoing.user.skip", { reason: "no write key", traits });
      return false;
    }

    const analytics = analyticsClient(write_key);

    // Look for an anonymousId
    // if we have events in the payload, we take the annymousId of the first event
    // Otherwise, we look for known anonymousIds attached to the user and we take the last one
    let anonymousId;
    if (events && events.length > 0 && events[0].anonymous_id) {
      anonymousId = events[0].anonymous_id;
    } else if (user.anonymous_ids && user.anonymous_ids.length) {
      anonymousId = _.first(user.anonymous_ids);
    }

    let publicIdField = "external_id";
    if (public_id_field) {
      publicIdField = public_id_field;
    }

    const userId = user[publicIdField];
    const groupId = user["traits_group/id"];

    const publicAccountIdField = public_account_id_field === "id" ? "id" : "external_id";
    const accountId = account && account[publicAccountIdField];

    // We have no identifier for the user, we have to skip
    if (!userId && !anonymousId) {
      asUser.logger.info("outgoing.user.skip", { reason: "No Identifier (userId or anonymousId)", traits });
      return false;
    }

    const segment_ids = _.map(segments, "id");
    if (
      !ignoreFilters &&
      synchronized_segments.length > 0 && // Should we move to "Send no one by default ?"
      !_.intersection(segment_ids, synchronized_segments).length
      ) {
      asUser.logger.info("outgoing.user.skip", { reason: "not matching any segment", segment_ids, traits });
      return false;
    }

    const integrations = { Hull: false };

    const context = { active: false, ip: 0 };

    try {
      // Add group if available
      if (handle_groups && groupId && userId) {
        context.groupId = groupId;
        const groupTraits = _.reduce(user, (group, value, key) => {
          const mk = key.match(/^traits_group\/(.*)/);
          const groupKey = mk && mk[1];
          if (groupKey && groupKey !== "id") {
            group[groupKey] = value;
          }
          return group;
        }, {});
        if (!_.isEmpty(groupTraits)) {
          asUser.logger.info("outgoing.group.success", { groupId, traits: groupTraits, context });
          analytics.group({ groupId, anonymousId, userId, traits: groupTraits, context, integrations });
        }
      } else if (handle_accounts && accountId) {
        const accountTraits = synchronized_account_properties
          .map(k => k.replace(/^account\./, ""))
          .reduce((props, prop) => {
            props[prop.replace("/", "_")] = account[prop];
            return props;
          }, {});

        if (!_.isEmpty(accountTraits)) {
          hull.logger.debug("group.send", { groupId: accountId, traits: accountTraits, context });
          analytics.group({ groupId: accountId, anonymousId, userId, traits: accountTraits, context, integrations });
        }

        asUser.account({ external_id: accountId }).logger.info("outgoing.account.success", { groupId: accountId, traits: accountTraits, context });
      }
    } catch (err) {
      console.warn("Error processing group update", err);
    }


    const ret = analytics.identify({ anonymousId, userId, traits, context, integrations });
    asUser.logger.info("outgoing.user.success", { userId, traits });

    if (events && events.length > 0) {
      events.map((e) => {
        // Don't forward events of source "segment" when forwarding disabled.
        if (e.event_source === "segment" && !forward_events) {
          asUser.logger.info("outgoing.event.skip", { reason: "Segment event without forwarding", event: e.event });
          return true;
        }
        if (send_events && send_events.length && !_.includes(send_events, e.event)) {
          asUser.logger.info("outgoing.event.skip", { reason: "not included in event list", event: e.event });
          return true;
        }

        const { location = {}, page = {}, referrer = {}, os = {}, useragent, ip = 0 } = e.context || {};
        const { event, properties } = e;
        const { name, category } = properties;
        page.referrer = referrer.url;

        const type = (event === "page" || event === "screen") ? event : "track";

        let track = {
          anonymousId: e.anonymous_id || anonymousId,
          timestamp: new Date(e.created_at),
          userId,
          properties,
          integrations,
          context: {
            ip,
            groupId,
            os,
            page,
            traits,
            location,
            userAgent: useragent,
            active: true,
          }
        };

        if (type === "page") {
          const p = { ...page, ...properties };
          track = {
            ...track,
            name,
            channel: "browser",
            properties: p
          };
          track.context.page = p;
          analytics.page(track);
        } else if (type === "screen") {
          track = {
            ...track,
            name,
            channel: "mobile",
            properties
          };
          analytics.enqueue("screen", track);
        } else {
          track = { ...track, event, category };
          analytics.track(track);
        }

        asUser.logger.info("outgoing.event.success", { type, track });
        return true;
      });
    }
    return ret;
  };
}
