const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canBypassPermission,
  determineDefaultAppRoleKeys,
  hasAnyPermission,
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

test("system admin bypasses feature permission middleware checks", () => {
  assert.equal(canBypassPermission({ systemRole: "ADMIN" }), true);
  assert.equal(canBypassPermission({ systemRole: "USER" }), false);
});

test("allows any matching feature action for composite modules", () => {
  const permissions = mergePermissions({
    rolePermissions: [
      { featureKey: "spare_part", action: "view", allowed: true },
    ],
  });

  assert.equal(
    hasAnyPermission(permissions, [
      ["tooling", "view"],
      ["spare_part", "view"],
    ]),
    true
  );
});

test("maps existing system roles to default feature roles", () => {
  assert.deepEqual(
    determineDefaultAppRoleKeys({ systemRole: "ADMIN" }),
    ["admin"]
  );

  assert.deepEqual(
    determineDefaultAppRoleKeys({ systemRole: "USER", role: "PRODUCTION" }),
    ["production_user"]
  );

  assert.deepEqual(
    determineDefaultAppRoleKeys({ systemRole: "USER", role: "INSPECTOR" }),
    ["technician"]
  );
});
