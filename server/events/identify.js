import { isEmpty, reduce, includes } from "lodash";
import scoped from "../scope-hull-client";

const ALIASED_FIELDS = {
  lastname: "last_name",
  firstname: "first_name",
  createdat: "created_at"
};

const IGNORED_TRAITS = [
  "id",
  "external_id",
  "guest_id",
  "uniqToken",
  "visitToken"
];

function updateUser(hull, user, shipSettings) {
  try {
    const { userId, anonymousId, traits = {} } = user;
    const { email } = traits || {};

    const asUser = hull.asUser({ external_id: userId, email, anonymous_id: anonymousId });

    if (shipSettings.ignore_segment_userId === true && !email && !anonymousId) {
      const logPayload = { id: user.id, anonymousId, email };
      asUser.logger.info("incoming.user.skip", { reason: "No email address or anonymous ID present when ignoring segment's user ID.", logPayload });
      return false;
    } else if (!userId && !anonymousId) {
      const logPayload = { id: user.id, userId, anonymousId };
      asUser.logger.info("incoming.user.skip", { reason: "No user ID or anonymous ID present.", logPayload });
      return false;
    }

    return scoped(hull, user, shipSettings, { active: true }).traits(traits).then(
      (/* response*/) => {
        return { traits };
      },
      (error) => {
        error.params = traits;
        throw error;
      }
    );
  } catch (err) {
    return Promise.reject(err);
  }
}

export default function handleIdentify(payload, { hull, metric, ship }) {
  const { traits, userId, anonymousId, integrations = {} } = payload;
  const user = reduce((traits || {}), (u, v, k) => {
    if (v == null) return u;
    if (ALIASED_FIELDS[k.toLowerCase()]) {
      u.traits[ALIASED_FIELDS[k.toLowerCase()]] = v;
    } else if (!includes(IGNORED_TRAITS, k)) {
      u.traits[k] = v;
    }
    return u;
  }, { userId, anonymousId, traits: {} });

  if (integrations.Hull && integrations.Hull.id === true) {
    user.hullId = user.userId;
    delete user.userId;
  }
  if (!isEmpty(user.traits)) {
    const updating = updateUser(hull, user, ship.settings);

    updating.then(
      ({ t = {} }) => {
        metric("request.identify.updateUser");
        hull.asUser({ email: t.email, externald_id: userId, anonymous_id: anonymousId }).logger.info("incoming.user.success", { traits: t });
      },
      (error) => {
        metric("request.identify.updateUser.error");
        hull.asUser({ externald_id: userId, anonymous_id: anonymousId }).logger.error("incoming.user.error", { errors: error });
      }
    );

    return updating;
  }
  return user;
}
