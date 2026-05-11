const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildToolStoreItemData,
  buildToolStoreTransactionData,
  calculateNextStock,
  normalizeToolStoreSelection,
  validateToolStoreTransaction,
} = require("../../backend/services/toolStore.service");

test("normalizes searchable dropdown selection and keeps other detail only for OTHER", () => {
  assert.deepEqual(
    normalizeToolStoreSelection({ value: "Torque Wrench", otherDetail: "ignored" }),
    { value: "Torque Wrench", otherDetail: null }
  );

  assert.deepEqual(
    normalizeToolStoreSelection({ value: "OTHER", otherDetail: "Special fixture" }),
    { value: "OTHER", otherDetail: "Special fixture" }
  );
});

test("builds item data from minimal searchable form fields", () => {
  const data = buildToolStoreItemData({
    itemCode: " tw-001 ",
    name: " Torque Wrench ",
    itemType: "TOOLING",
    category: "OTHER",
    categoryOther: "Calibration tool",
    unit: "pcs",
    currentStock: "2",
    minStock: "1",
    location: "Store A",
    barcode: "TW001",
  });

  assert.deepEqual(data, {
    itemCode: "TW-001",
    name: "Torque Wrench",
    itemType: "TOOLING",
    category: "OTHER",
    categoryOther: "Calibration tool",
    unit: "pcs",
    currentStock: 2,
    minStock: 1,
    location: "Store A",
    barcode: "TW001",
    status: "ACTIVE",
  });
});

test("calculates stock movement for receive issue borrow and return", () => {
  assert.equal(calculateNextStock(5, "RECEIVE", 3), 8);
  assert.equal(calculateNextStock(5, "ISSUE", 2), 3);
  assert.equal(calculateNextStock(5, "BORROW", 1), 4);
  assert.equal(calculateNextStock(5, "RETURN", 2), 7);
});

test("rejects issue or borrow when stock would become negative", () => {
  assert.throws(
    () => calculateNextStock(1, "ISSUE", 2),
    /Insufficient stock/
  );
  assert.throws(
    () => calculateNextStock(0, "BORROW", 1),
    /Insufficient stock/
  );
});

test("requires item action and positive quantity for scan transaction", () => {
  const result = validateToolStoreTransaction({
    action: "ISSUE",
    quantity: "0",
    scanCode: "BR-001",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["itemId is required", "quantity must be greater than 0"]);
});

test("builds transaction data with user machine and scan context", () => {
  const data = buildToolStoreTransactionData(
    {
      itemId: "10",
      action: "BORROW",
      quantity: "1",
      machineId: "7",
      jobRequestId: "3",
      scanCode: "TW001",
      note: "Use for PM",
    },
    { id: 5 }
  );

  assert.deepEqual(data, {
    itemId: 10,
    action: "BORROW",
    quantity: 1,
    machineId: 7,
    jobRequestId: 3,
    userId: 5,
    scanCode: "TW001",
    note: "Use for PM",
  });
});
