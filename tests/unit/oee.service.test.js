const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildMachineStatusSnapshot,
  calculateOee,
  calculatePerformance,
  calculateQuality,
} = require("../../backend/services/oee.service");

test("calculates oee from availability performance and quality", () => {
  assert.deepEqual(calculateOee({ availability: 90, performance: 80, quality: 95 }), {
    availability: 90,
    performance: 80,
    quality: 95,
    oee: 68.4,
  });
});

test("clamps invalid oee percentage inputs", () => {
  assert.deepEqual(calculateOee({ availability: 120, performance: -10, quality: "bad" }), {
    availability: 100,
    performance: 0,
    quality: 0,
    oee: 0,
  });
});

test("calculates production quality from actual and ng counts", () => {
  assert.equal(calculateQuality({ actualCount: 100, ngCount: 3 }), 97);
  assert.equal(calculateQuality({ actualCount: 0, ngCount: 3 }), 100);
});

test("calculates performance from actual and target counts", () => {
  assert.equal(calculatePerformance({ actualCount: 450, targetCount: 500 }), 90);
  assert.equal(calculatePerformance({ actualCount: 10, targetCount: 0 }), 0);
});

test("builds a machine status snapshot with derived oee metrics", () => {
  const snapshot = buildMachineStatusSnapshot(
    { id: 7, code: "MC-007", name: "Press 7", location: "Line A" },
    { status: "RUNNING", actualCount: 450, targetCount: 500, ngCount: 9 }
  );

  assert.deepEqual(snapshot, {
    machine: {
      id: 7,
      code: "MC-007",
      name: "Press 7",
      location: "Line A",
    },
    status: "RUNNING",
    actualCount: 450,
    targetCount: 500,
    ngCount: 9,
    metrics: {
      availability: 100,
      performance: 90,
      quality: 98,
      oee: 88.2,
    },
  });
});
