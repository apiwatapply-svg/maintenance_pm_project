function buildSocketPayload({ event, actor = null, data = {}, meta = {} }) {
  return {
    event,
    timestamp: new Date().toISOString(),
    actor: actor
      ? {
          user_id: actor.id,
          name: actor.name || actor.username || "Unknown",
        }
      : null,
    data,
    meta,
  };
}

function emitFeatureEvent(io, room, payload) {
  io.to(room).emit(payload.event, payload);
}

function getSocketRoomsForUser(user) {
  const rooms = ["global"];

  if (user?.id) {
    rooms.push(`user:${user.id}`);
  }

  if (user?.systemRole) {
    rooms.push(`role:${user.systemRole}`);
  }

  return rooms;
}

module.exports = {
  buildSocketPayload,
  emitFeatureEvent,
  getSocketRoomsForUser,
};
