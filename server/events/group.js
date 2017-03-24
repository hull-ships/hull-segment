export default function handleGroup(event, { hull, ship }) {
  const { handle_groups } = ship.settings || {};
  if (event && event.groupId && handle_groups === true) {
    let scopedClient;
    if (event.userId) {
      scopedClient = hull.asUser({ external_id: event.userId })
        .account({ external_id: event.groupId });
    } else {
      scopedClient = hull.asAccount({ external_id: event.groupId });
    }

    return scopedClient.traits(event.traits, { source: "segment" });
  }

  return Promise.resolve();
}

