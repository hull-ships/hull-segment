// @flow

import Promise from "bluebird";
import type { Hull } from "hull";
import type { HullClient, SegmentShip, SegmentGroup, User } from "../types";

type LocalContext = {
  hull: Hull,
  ship: SegmentShip
};

export default function handleGroup(
  event: SegmentGroup,
  { hull, ship }: LocalContext
) {
  if (!event || !event.groupId) return Promise.resolve();

  const scopedClient = event.userId
    ? hull
        .asUser({ external_id: event.userId })
        .account({ external_id: event.groupId })
    : hull.asAccount({ external_id: event.groupId });
  scopedClient.logger.info(`incoming.account.success`, event.traits);
  scopedClient.metric.increment(`request.group.success`);
  return scopedClient.traits(event.traits);
}
