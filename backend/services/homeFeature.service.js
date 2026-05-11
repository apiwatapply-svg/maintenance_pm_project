const HOME_FEATURE_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "reject",
  "assign",
  "export",
  "admin",
];

function buildHomeFeatureResponse(features, permissionMap, hasPermission) {
  return features
    .map((feature) => ({
      feature_key: feature.featureKey,
      title: feature.title,
      description: feature.description,
      route_path: feature.routePath,
      enabled: feature.enabled,
      future: feature.future,
      permissions: Object.fromEntries(
        HOME_FEATURE_ACTIONS.map((action) => [
          action,
          hasPermission(permissionMap, feature.featureKey, action),
        ])
      ),
      summary: feature.future ? { status: "Future" } : {},
    }))
    .filter((feature) => feature.permissions.view || feature.future);
}

module.exports = {
  HOME_FEATURE_ACTIONS,
  buildHomeFeatureResponse,
};
