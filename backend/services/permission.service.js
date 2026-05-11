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

module.exports = {
  permissionKey,
  mergePermissions,
  hasPermission,
};
