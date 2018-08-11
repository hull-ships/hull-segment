// @flow

import _ from "lodash";
import fp from "lodash/fp";
import type { HullContext, HullUserUpdateMessage, HullEvent } from "hull";
import type {
  SegmentClientFactory,
  SegmentContext,
  SegmentConnector,
  NotificationCallbackResponse,
  Transaction
} from "../types";
import segmentEvent from "../lib/segment-event";
import setFlowControl from "../lib/set-flow-control";
import { getfirstNonNull, getFirstAnonymousIdFromEvents } from "../lib/utils";

type LocalContext = HullContext & {
  connector: SegmentConnector
};

const context: SegmentContext = { active: false, ip: 0 };
const integrations = { Hull: false };

function update(
  analyticsClient,
  { connector, hull, isBatch }: LocalContext,
  message: HullUserUpdateMessage
): NotificationCallbackResponse {
  const { settings = {}, private_settings = {} } = connector;
  const { user = {}, user_segments, events } = message;
  const account = message.account || user.account;

  // Empty payload ?
  if (!user.id || !connector.id) {
    return;
  }

  const asUser = hull.asUser(user);

  const {
    synchronized_properties = [],
    synchronized_segments = [],
    forward_events = false,
    send_events = []
  } = private_settings;

  const {
    write_key,
    handle_groups,
    handle_accounts,
    public_id_field,
    public_account_id_field
  } = settings;

  if (!write_key) {
    return;
  }

  const analytics = analyticsClient(write_key);
  // Look for an anonymousId
  // if we have events in the payload, we take the annymousId of the first event
  // Otherwise, we look for known anonymousIds attached to the user and we take the first one
  const anonymousId =
    getFirstAnonymousIdFromEvents(events) || getfirstNonNull(user.anonymous_id);
  const userId = user[public_id_field];
  const groupId = account[public_account_id_field];
  const segmentIds = _.map(user_segments, "id");

  // We have no identifier for the user, we have to skip
  if (!userId && !anonymousId) {
    return {
      action: "skip",
      message: "No Identifier available",
      id: account.id,
      type: "account",
      data: { anonymousId, userId, public_id_field }
    };
  }

  //Process everyone when in batch mode.
  if (!isBatch && !_.size(_.intersection(segmentIds, synchronized_segments))) {
    return {
      action: "skip",
      message: "Not matching any segment",
      id: user.id,
      type: "user",
      data: { anonymousId, userId, segmentIds }
    };
  }

  const traits = _.reduce(
    synchronized_properties,
    (traits, attribute) => {
      if (attribute.indexOf("account.") === 0) {
        // Account attribute at User Level
        const t = attribute.replace(/^account\./, "");
        traits[`account_${t.replace("/", "_")}`] = _.get(account, t);
      } else {
        //Trait
        traits[attribute.replace(/^traits_/, "").replace("/", "_")] = _.get(
          user,
          attribute
        );
      }
      return traits;
    },
    {
      hull_segments: _.map(user_segments, "name")
    }
  );

  analytics.identify({
    anonymousId,
    userId,
    traits,
    context,
    integrations
  });
  asUser.logger.info("outgoing.user.success", { traits });

  events.map(
    (e: HullEvent): void | Transaction => {
      const { event, event_source, context = {} } = e;
      if (event_source === "segment" && !forward_events) {
        // Skip event if it comes from Segment and we're not forwarding events
        return {
          action: "skip",
          message: "Event comes from segment and forward_events is disabled",
          id: user.id,
          type: "user",
          data: { anonymousId, userId, segmentIds, eventId: e.id }
        };
      }

      if (!_.includes(send_events, e.event)) {
        return {
          action: "skip",
          message: "Event not in whitelisted list",
          id: user.id,
          type: "user",
          data: { anonymousId, userId, segmentIds, eventId: e.id }
        };
      }

      const track = segmentEvent({
        anonymousId,
        event: e,
        userId,
        groupId,
        traits,
        integrations
      });

      const type = event === "page" || event === "screen" ? event : "track";

      if (track.channel === "browser") {
        analytics.page(track);
      } else if (track.channel === "mobile") {
        analytics.enqueue("screen", track);
      } else {
        analytics.track(track);
      }
      asUser.logger.info("outgoing.event.success", { track });
    }
  );
}

module.exports = (analyticsClient: SegmentClientFactory) => (
  ctx: HullContext,
  messages: Array<HullUserUpdateMessage>
) => {
  setFlowControl(ctx);
  return Promise.all(
    messages.map(message => update(analyticsClient, ctx, message))
  );
};
