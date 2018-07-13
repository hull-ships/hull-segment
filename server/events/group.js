import { reduce, isEmpty, values, map, throttle } from "lodash";
import Promise from "bluebird";

const BATCH_HANDLERS = {};
const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || 100, 10);
const BATCH_THROTTLE = parseInt(process.env.BATCH_THROTTLE || 5000, 10);

export default function handleGroup(event, { hull, ship, metric }) {
  const { handle_accounts } = ship.settings;
  if (handle_accounts === true && event && event.groupId) {
    let scopedClient;
    if (event.userId) {
      scopedClient = hull.asUser({ external_id: event.userId })
        .account({ external_id: event.groupId });
    } else {
      scopedClient = hull.asAccount({ external_id: event.groupId });
    }

    return scopedClient.traits(event.traits);
  }

  return Promise.resolve();
}
