function toInteger(value, fallback = null) {
  const numberValue = Number.parseInt(value, 10);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeSelectableValue({ value, otherDetail }) {
  const normalizedValue = value || null;

  return {
    value: normalizedValue,
    otherDetail:
      normalizedValue === "OTHER" && typeof otherDetail === "string"
        ? otherDetail.trim() || null
        : null,
  };
}

function validateJobRequestInput(input = {}) {
  const errors = [];

  if (!toInteger(input.machineId)) {
    errors.push("machineId is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function buildJobRequestCreateData(input = {}, user = null) {
  const category = normalizeSelectableValue({
    value: input.category,
    otherDetail: input.categoryOther,
  });
  const symptom = normalizeSelectableValue({
    value: input.symptom,
    otherDetail: input.symptomOther,
  });

  return {
    machineId: toInteger(input.machineId),
    createdById: user?.id ? toInteger(user.id) : null,
    status: "NEW",
    priority: input.priority || "NORMAL",
    category: category.value,
    categoryOther: category.otherDetail,
    symptom: symptom.value,
    symptomOther: symptom.otherDetail,
    description: typeof input.description === "string" ? input.description.trim() || null : null,
    productionImpact: Boolean(input.productionImpact),
    machineStopped: Boolean(input.machineStopped),
    ngCount: input.ngCount === undefined || input.ngCount === "" ? null : toInteger(input.ngCount, 0),
  };
}

function buildJobRequestNo(date = new Date(), dailyCount = 0) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const sequence = String(dailyCount + 1).padStart(4, "0");

  return `JR-${year}${month}${day}-${sequence}`;
}

module.exports = {
  buildJobRequestCreateData,
  buildJobRequestNo,
  normalizeSelectableValue,
  validateJobRequestInput,
};
