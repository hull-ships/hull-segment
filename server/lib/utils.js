//@flow

import fp from "lodash/fp";

export const getfirstNonNull = fp.flow(
  fp.compact,
  fp.first
);

export const getFirstAnonymousIdFromEvents = fp.flow(
  fp.map(e => e.anonymous_id),
  getfirstNonNull
);
