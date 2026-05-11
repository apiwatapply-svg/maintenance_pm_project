function permissionKey(featureKey, action) {
  return `${featureKey}.${action}`;
}

function mergePermissions({ rolePermissions = [], overrides = [] }) {
  const map = {};

  for (const item of rolePermissions) {
    map[permissionKey(item.featureKey, item.action)] = Boolean(item.allowed);
  }

  for (const item of overrides) {
    map[permissionKey(item.featureKey, item.action)] = Boolean(item.allowed);
  }

  return map;
}

function hasPermission(permissionMap, featureKey, action) {
  return Boolean(permissionMap[permissionKey(featureKey, action)]);
}

function hasAnyPermission(permissionMap, requiredPermissions = []) {
  return requiredPermissions.some(([featureKey, action]) =>
    hasPermission(permissionMap, featureKey, action)
  );
}

function canBypassPermission(user) {
  return user?.systemRole === "ADMIN";
}

function determineDefaultAppRoleKeys(user = {}) {
  if (user.systemRole === "ADMIN") {
    return ["admin"];
  }

  const userRole = typeof user.role === "string" ? user.role.toUpperCase() : "";

  if (userRole.includes("PRODUCTION")) {
    return ["production_user"];
  }

  return ["technician"];
}

module.exports = {
  canBypassPermission,
  determineDefaultAppRoleKeys,
  hasAnyPermission,
  permissionKey,
  mergePermissions,
  hasPermission,
};
