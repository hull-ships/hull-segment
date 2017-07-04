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
    event: "screen",
    active: true
  };

  return track(screen, context)
  .then(() => {
    context.hull.logger.info("incoming.screen.success", payload);
  }, (error) => {
    context.hull.logger.error("incoming.screen.error", { ...payload, error });
  });
}
