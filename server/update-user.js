import _ from "lodash";

// function camelize(str) {
//   return str.replace (/(?:^|[-_])(\w)/g, function (_, c, i) {
//     var s = i == 0 ? c : c.toUpperCase();
//     return c ? s : "";
//   });
// };

export default function updateUserFactory(analyticsClient) {
  return function updateUser({ message = {} }, { ship = {}, hull = {}, ignoreFilters = false }) {
    const { user = {}, segments = [], events = [] } = message;

    // Empty payload ?
    if (!user.id || !ship.id) {
      return false;
    }

    const loggingProperties = _.pick(user, "id", "email", "external_id");

    // Configure Analytics.js with write key
    // Ignore if write_key is not present
    const { write_key, handle_groups, public_id_field } = ship.settings || {};
    if (!write_key) {
      hull.logger.info("outgoing.user.skip", { ...loggingProperties, reason: "no write key" });
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

    const publicIdField = public_id_field === "id" ? "id" : "external_id";

    const userId = user[publicIdField];
    const groupId = user["traits_group/id"];

    // We have no identifier for the user, we have to skip
    if (!userId && !anonymousId) {
      hull.logger.info("outgoing.user.skip", { ...loggingProperties, reason: "No Identifier (userId or anonymousId)" });
      return false;
    }

    // Custom properties to be synchronized
    const {
      synchronized_properties = [],
      synchronized_segments = [],
      forward_events = false,
      send_events = []
    } = ship.private_settings || {};
    const segment_ids = _.map(segments, "id");
    if (
      !ignoreFilters &&
      synchronized_segments.length > 0 && // Should we move to "Send no one by default ?"
      !_.intersection(segment_ids, synchronized_segments).length
      ) {
      hull.logger.info("outgoing.user.skip", { ...loggingProperties, reason: "not matching any segment", segment_ids });
      return false;
    }

    // Build traits that will be sent to Segment
    // Use hull_segments by default

    const traits = { hull_segments: _.map(segments, "name") };

    if (synchronized_properties.length > 0) {
      synchronized_properties.map((prop) => {
        traits[prop.replace(/^traits_/, "").replace("/", "_")] = user[prop];
        return true;
      });
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
          hull.logger.debug("group.send", { ...loggingProperties, groupId, traits: groupTraits, context });
          analytics.group({ groupId, anonymousId, userId, traits: groupTraits, context, integrations });
        }
      }
    } catch (err) {
      console.warn("Error processing group update", err);
    }


    hull.logger.debug("identify.send", { userId, traits, context });
    const ret = analytics.identify({ anonymousId, userId, traits, context, integrations });
    hull.logger.info("outgoing.user.success", { ...loggingProperties, traits });

    if (events && events.length > 0) {
      events.map(e => {
        // Don't forward events of source "segment" when forwarding disabled.
        if (e.event_source === "segment" && !forward_events) {
          hull.logger.info("outgoing.event.skip", { ...loggingProperties, reason: "Segment event without forwarding", event: e.event });
          return true;
        }
        if (send_events && send_events.length && !_.includes(send_events, e.event)) {
          hull.logger.info("outgoing.event.skip", { ...loggingProperties, reason: "not included in event list", event: e.event });
          return true;
        }

        hull.logger.debug("event.send", { ...loggingProperties, event: e.event });

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
            ip, groupId, os, page, traits, location,
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

        hull.logger.debug(`${type}.send`, { ...loggingProperties, track });
        hull.logger.info("outgoing.event.success", { ...loggingProperties, type, track });

        return true;
      });
    }
    return ret;
  };
}
