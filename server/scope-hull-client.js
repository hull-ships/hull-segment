const EMAIL_REGEXP = /([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})/i;

export default function scope(hull, user = {} /* , context = {}*/) {
  const { hullId, userId, anonymousId, traits = {} } = user;
  if (!hullId && !userId && !anonymousId) {
    return hull;
  }
  const as = {};

  if (hullId || userId) {
    if (hullId) { as.id = hullId; }
    // If we have a userId
    if (userId) {
      // and it starts with 'auth0'
      if (userId.indexOf("auth0") === 0) {
        // then use it as our External ID
        as.external_id = userId;
      } else {
        // else drop it in the AnonymousId field
        as.guest_id = userId;
      }
    } else if (anonymousId) {
      // fallback to anonymousId because we don't have a UserId
      as.guest_id = anonymousId;
    }
  }

  if (traits.email && EMAIL_REGEXP.test(traits.email)) {
    as.email = traits.email.toLowerCase();
  }

  return hull.as(as);
}
