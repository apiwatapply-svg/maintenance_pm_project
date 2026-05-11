const STOCK_IN_ACTIONS = new Set(["RECEIVE", "RETURN"]);
const STOCK_OUT_ACTIONS = new Set(["ISSUE", "BORROW"]);
const TOOL_STORE_ACTIONS = new Set([
  ...STOCK_IN_ACTIONS,
  ...STOCK_OUT_ACTIONS,
]);
const TOOL_STORE_ITEM_TYPES = new Set(["TOOLING", "SPARE_PART"]);

function toInteger(value, fallback = null) {
  const numberValue = Number.parseInt(value, 10);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeCode(value) {
  return normalizeText(value)?.toUpperCase() || null;
}

function normalizeToolStoreSelection({ value, otherDetail }) {
  const normalizedValue = normalizeText(value);

  return {
    value: normalizedValue,
    otherDetail:
      normalizedValue === "OTHER" && typeof otherDetail === "string"
        ? otherDetail.trim() || null
        : null,
  };
}

function buildToolStoreItemData(input = {}) {
  const category = normalizeToolStoreSelection({
    value: input.category,
    otherDetail: input.categoryOther,
  });
  const itemType = normalizeCode(input.itemType) || "TOOLING";

  return {
    itemCode: normalizeCode(input.itemCode),
    name: normalizeText(input.name),
    itemType: TOOL_STORE_ITEM_TYPES.has(itemType) ? itemType : "TOOLING",
    category: category.value,
    categoryOther: category.otherDetail,
    unit: normalizeText(input.unit) || "pcs",
    currentStock: toInteger(input.currentStock, 0),
    minStock: toInteger(input.minStock, 0),
    location: normalizeText(input.location),
    barcode: normalizeText(input.barcode),
    status: normalizeCode(input.status) || "ACTIVE",
  };
}

function validateToolStoreItem(input = {}) {
  const data = buildToolStoreItemData(input);
  const errors = [];

  if (!data.itemCode) errors.push("itemCode is required");
  if (!data.name) errors.push("name is required");
  if (!TOOL_STORE_ITEM_TYPES.has(data.itemType)) errors.push("itemType is invalid");
  if (data.currentStock < 0) errors.push("currentStock cannot be negative");
  if (data.minStock < 0) errors.push("minStock cannot be negative");

  return { valid: errors.length === 0, errors, data };
}

function calculateNextStock(currentStock, action, quantity) {
  const normalizedAction = normalizeCode(action);
  const stock = toInteger(currentStock, 0);
  const movementQuantity = toInteger(quantity, 0);

  if (!TOOL_STORE_ACTIONS.has(normalizedAction)) {
    throw new Error("Invalid stock action");
  }
  if (movementQuantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (STOCK_IN_ACTIONS.has(normalizedAction)) {
    return stock + movementQuantity;
  }

  const nextStock = stock - movementQuantity;
  if (nextStock < 0) {
    throw new Error("Insufficient stock");
  }
  return nextStock;
}

function validateToolStoreTransaction(input = {}) {
  const errors = [];
  const action = normalizeCode(input.action);
  const quantity = toInteger(input.quantity, 0);

  if (!toInteger(input.itemId)) errors.push("itemId is required");
  if (!TOOL_STORE_ACTIONS.has(action)) errors.push("action is invalid");
  if (quantity <= 0) errors.push("quantity must be greater than 0");

  return { valid: errors.length === 0, errors };
}

function buildToolStoreTransactionData(input = {}, user = null) {
  return {
    itemId: toInteger(input.itemId),
    action: normalizeCode(input.action),
    quantity: toInteger(input.quantity, 0),
    machineId: toInteger(input.machineId),
    jobRequestId: toInteger(input.jobRequestId),
    userId: user?.id ? toInteger(user.id) : null,
    scanCode: normalizeText(input.scanCode),
    note: normalizeText(input.note),
  };
}

module.exports = {
  TOOL_STORE_ACTIONS,
  TOOL_STORE_ITEM_TYPES,
  buildToolStoreItemData,
  buildToolStoreTransactionData,
  calculateNextStock,
  normalizeToolStoreSelection,
  validateToolStoreItem,
  validateToolStoreTransaction,
};
