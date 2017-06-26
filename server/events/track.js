import { reduce } from "lodash";
import scoped from "../scope-hull-client";

export default function handleTrack(payload, { hull, metric }) {
  const { context = {}, active, anonymousId, event, properties, userId, originalTimestamp, sentAt, receivedAt, integrations = {} } = payload;

  const { logger } = hull;
  const { page = {}, location = {}, userAgent, ip = "0" } = context;
  const { url, referrer } = page;
  const { latitude, longitude } = location;

  const created_at = originalTimestamp || sentAt || receivedAt;

  const _bid = anonymousId || userId;
  let _sid = (created_at || new Date().toISOString()).substring(0, 10);

  if (_bid) {
    _sid = [_bid, _sid].join("-");
  }

  const trackContext = reduce({
    source: "segment",
    created_at, _bid, _sid,
    url, referrer, useragent: userAgent,
    ip, latitude, longitude, active
  }, (p, v, k) => {
    if (v !== undefined) {
      p[k] = v;
    }
    return p;
  }, {});

  if (integrations.Hull && integrations.Hull.id === true) {
    payload.hullId = payload.userId;
    delete payload.userId;
  }

  const tracking = scoped(hull, payload).track(event, properties, trackContext);

  tracking.then(
    () => {
      logger.info("incoming.track.success", { userId, anonymousId, trackContext, event, properties });
    },
    message => {
      metric("request.track.error");
      logger.info("incoming.track.error", { userId, anonymousId, message });
    }
  );

  return tracking;
}
