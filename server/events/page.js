import track from "./track";

export default function handlePage(payload = {}, context = {}) {
  const { ship = {} } = context;
  const { handle_pages } = ship.settings || {};
  if (!handle_pages) { return false; }

  const { properties } = payload;
  properties.name = payload.name;

  const page = {
    ...payload,
    properties,
    event: "page"
  };

  return track(page, context);
}
