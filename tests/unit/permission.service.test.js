const test = require("node:test");
const assert = require("node:assert/strict");
const {
  mergePermissions,
  hasPermission,
} = require("../../backend/services/permission.service");

test("role permission allows feature action", () => {
  const permissions = mergePermissions({
    rolePermissions: [
      { featureKey: "job_request", action: "create", allowed: true },
    ],
    overrides: [],
  });

  assert.equal(hasPermission(permissions, "job_request", "create"), true);
});

test("user override can deny role permission", () => {
  const permissions = mergePermissions({
    rolePermissions: [
      { featureKey: "analysis", action: "export", allowed: true },
    ],
    overrides: [
      { featureKey: "analysis", action: "export", allowed: false },
    ],
  });

  assert.equal(hasPermission(permissions, "analysis", "export"), false);
});
