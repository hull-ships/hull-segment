export default function handleGroup(event, { hull, ship }) {
  if (event && event.groupId) {
    let scopedClient;
    if (event.userId) {
      scopedClient = hull.asUser({ external_id: event.userId })
        .account({ external_id: event.groupId });
    } else {
      scopedClient = hull.asAccount({ external_id: event.groupId });
    }

    return scopedClient.traits(event.traits);
  }

  return Promise.resolve();
}
