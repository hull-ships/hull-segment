import track from "./track";

export default function handleScreen(payload = {}, context = {}) {
  const { ship = {} } = context;
  const { handle_screens } = ship.settings || {};
  if (!handle_screens) { return false; }

  const { properties } = payload;
  properties.name = payload.name;

  const screen = {
    ...payload,
    properties,
    event: "screen"
  };
  return track(screen, context);
}
