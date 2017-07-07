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
    context.hull.asUser(payload).logger.info("incoming.screen.success");
  }, (error) => {
    context.hull.asUser(payload).logger.error("incoming.screen.error", { errors: error });
  });
}
