import { isEmpty, reduce, include } from 'lodash'

const TOP_LEVEL_FIELDS = [
  'name',
  'description',
  'username',
  'first_name',
  'last_name',
  'email',
  'contact_email',
  'image',
  'picture',
  'address',
  'created_at'
];

const ALIASED_FIELDS = {
  lastname: 'last_name',
  firstname: 'first_name',
  createdat: 'created_at'
};

const IGNORED_TRAITS = [
  'id',
  'uniqToken',
  'visitToken'
];

function updateUser(hull, user) {
  try {
    const { userId, anonymousId, properties, traits } = user;
    let client = hull;

    if (userId) {
      let hullAs = { external_id: userId };
      if (anonymousId) {
        hullAs.guest_id = anonymousId;
      }
      client = hull.as(hullAs);
    } else if (anonymousId) {
      properties._bid = anonymousId;
      properties.contact_email = properties.email;
      delete properties.email;
    }

    if (process.env.DEBUG) {
      console.warn('[identify]', JSON.stringify({ userId, anonymousId, properties, traits }));
    }

    return client.put('me', Object.assign({}, properties, { traits }));
  } catch (err) {
    return Promise.reject(err);
  }
}

export default function handleIdentify(payload, { hull }) {
  const { context, traits, userId, anonymousId } = payload;
  const user = reduce((traits || {}), (u, v, k) => {
    if (v == null) return u;
    if (include(TOP_LEVEL_FIELDS, k)) {
      u.properties[k] = v;
    } else if (ALIASED_FIELDS[k.toLowerCase()]) {
      u.properties[ALIASED_FIELDS[k.toLowerCase()]] = v;
    } else if (!include(IGNORED_TRAITS, k)) {
      u.traits[k] = v;
    }
    return u;
  }, { userId, anonymousId, properties: {}, traits: {} });

  if (!isEmpty(user.traits) || !isEmpty(user.properties)) {
    return updateUser(hull, user);
  }
}
