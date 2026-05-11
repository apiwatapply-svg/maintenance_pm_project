const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildJobRequestCreateData,
  buildJobRequestNo,
  normalizeSelectableValue,
  validateJobRequestInput,
} = require("../../backend/services/jobRequest.service");

test("normalizes dropdown selection and keeps other detail only for OTHER", () => {
  assert.deepEqual(
    normalizeSelectableValue({ value: "bearing_noise", otherDetail: "ignored" }),
    { value: "bearing_noise", otherDetail: null }
  );

  assert.deepEqual(
    normalizeSelectableValue({ value: "OTHER", otherDetail: "Oil leak near pump" }),
    { value: "OTHER", otherDetail: "Oil leak near pump" }
  );
});

test("requires machine and searchable dropdown selections for fast request", () => {
  const result = validateJobRequestInput({
    category: "mechanical",
    symptom: "OTHER",
    symptomOther: "Abnormal vibration",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["machineId is required"]);
});

test("builds minimal job request data with typed other values", () => {
  const data = buildJobRequestCreateData(
    {
      machineId: "12",
      category: "OTHER",
      categoryOther: "Utility",
      symptom: "noise",
      priority: "HIGH",
      productionImpact: true,
      machineStopped: false,
      ngCount: "4",
      description: "Short note",
    },
    { id: 5 }
  );

  assert.deepEqual(data, {
    machineId: 12,
    createdById: 5,
    status: "NEW",
    priority: "HIGH",
    category: "OTHER",
    categoryOther: "Utility",
    symptom: "noise",
    symptomOther: null,
    description: "Short note",
    productionImpact: true,
    machineStopped: false,
    ngCount: 4,
  });
});

test("generates stable daily request number from count", () => {
  const requestNo = buildJobRequestNo(new Date("2026-05-11T03:04:05.000Z"), 8);
  assert.equal(requestNo, "JR-20260511-0009");
});
