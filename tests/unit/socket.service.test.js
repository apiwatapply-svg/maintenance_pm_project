const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSocketPayload,
  emitFeatureEvent,
  getSocketRoomsForUser,
} = require("../../backend/services/socket.service");

test("builds standard socket payload", () => {
  const payload = buildSocketPayload({
    event: "job_request:created",
    actor: { id: 7, name: "Production User" },
    data: { id: 11 },
    meta: { feature: "job_request", machine_id: 10 },
  });

  assert.equal(payload.event, "job_request:created");
  assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(payload.actor, { user_id: 7, name: "Production User" });
  assert.deepEqual(payload.data, { id: 11 });
  assert.deepEqual(payload.meta, { feature: "job_request", machine_id: 10 });
});

test("emits payload to room", () => {
  const calls = [];
  const io = {
    to(room) {
      calls.push(["to", room]);
      return {
        emit(event, payload) {
          calls.push(["emit", event, payload]);
        },
      };
    },
  };

  const payload = buildSocketPayload({
    event: "notification:new",
    data: { id: 1 },
  });

  emitFeatureEvent(io, "user:1", payload);

  assert.equal(calls[0][1], "user:1");
  assert.equal(calls[1][1], "notification:new");
  assert.equal(calls[1][2], payload);
});

test("returns base socket rooms for authenticated user", () => {
  assert.deepEqual(getSocketRoomsForUser({ id: 3, systemRole: "ADMIN" }), [
    "global",
    "user:3",
    "role:ADMIN",
  ]);
});
