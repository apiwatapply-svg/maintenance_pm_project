function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, toNumber(value)));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function calculateOee({ availability, performance, quality }) {
  const normalizedAvailability = clampPercent(availability);
  const normalizedPerformance = clampPercent(performance);
  const normalizedQuality = clampPercent(quality);
  const oee =
    (normalizedAvailability / 100) *
    (normalizedPerformance / 100) *
    (normalizedQuality / 100) *
    100;

  return {
    availability: round(normalizedAvailability),
    performance: round(normalizedPerformance),
    quality: round(normalizedQuality),
    oee: round(oee),
  };
}

function calculateQuality({ actualCount, ngCount }) {
  const actual = Math.max(0, toNumber(actualCount));
  const ng = Math.max(0, toNumber(ngCount));

  if (actual === 0) {
    return 100;
  }

  return ((actual - Math.min(actual, ng)) / actual) * 100;
}

function calculatePerformance({ actualCount, targetCount }) {
  const actual = Math.max(0, toNumber(actualCount));
  const target = Math.max(0, toNumber(targetCount));

  if (target === 0) {
    return 0;
  }

  return (actual / target) * 100;
}

function buildMachineStatusSnapshot(machine, input = {}) {
  const status = input.status || "UNKNOWN";
  const actualCount = Math.max(0, toNumber(input.actualCount));
  const targetCount = Math.max(0, toNumber(input.targetCount));
  const ngCount = Math.max(0, toNumber(input.ngCount));

  const availability = input.availability ?? (status === "RUNNING" ? 100 : 0);
  const performance = input.performance ?? calculatePerformance({ actualCount, targetCount });
  const quality = input.quality ?? calculateQuality({ actualCount, ngCount });

  return {
    machine: {
      id: machine.id,
      code: machine.code,
      name: machine.name,
      location: machine.location || null,
    },
    status,
    actualCount,
    targetCount,
    ngCount,
    metrics: calculateOee({ availability, performance, quality }),
  };
}

module.exports = {
  buildMachineStatusSnapshot,
  calculateOee,
  calculatePerformance,
  calculateQuality,
};
