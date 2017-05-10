const EMAIL_REGEXP = /([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})/i;

export default function scope(hull, user = {} /* , context = {}*/) {
  const { hullId, userId, anonymousId, traits = {} } = user;
  if (!hullId && !userId && !anonymousId) {
    return hull;
  }
  const as = {};

  if (hullId || userId) {
    if (hullId) { as.id = hullId; }
    if (userId) { as.external_id = userId; }
  }

  if (traits.email && EMAIL_REGEXP.test(traits.email)) {
    as.email = traits.email.toLowerCase();
  }

  if (anonymousId) {
    as.anonymous_id = anonymousId;
  }

  return hull.asUser(as);
}
