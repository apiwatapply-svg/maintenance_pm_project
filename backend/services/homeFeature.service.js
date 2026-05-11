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

const MAIN_HOME_FEATURES = [
  {
    featureKey: "preventive",
    title: "Preventive Maintenance",
    description: "Open the completed preventive maintenance workspace.",
    routePath: "/machines/overall",
    sourceFeatureKeys: ["preventive"],
  },
  {
    featureKey: "predictive",
    title: "Predictive Maintenance",
    description: "Upcoming predictive maintenance workspace.",
    routePath: "/predictive-future",
    enabled: false,
    future: true,
    sourceFeatureKeys: ["predictive"],
  },
  {
    featureKey: "tool_store",
    title: "Tooling & Store",
    description: "Manage tool lending, receiving, issuing, and store stock workflows.",
    routePath: "/tooling",
    sourceFeatureKeys: ["tooling", "spare_part"],
    summary: { modules: "Tooling + Store" },
  },
  {
    featureKey: "job_request",
    title: "Job Request",
    description: "Create and track fast maintenance job requests.",
    routePath: "/job-requests",
    sourceFeatureKeys: ["job_request"],
  },
];

function buildPermissions(permissionMap, sourceFeatureKeys, hasPermission) {
  return Object.fromEntries(
    HOME_FEATURE_ACTIONS.map((action) => [
      action,
      sourceFeatureKeys.some((featureKey) =>
        hasPermission(permissionMap, featureKey, action)
      ),
    ])
  );
}

function buildHomeFeatureResponse(features, permissionMap, hasPermission) {
  const featureByKey = new Map(
    features.map((feature) => [feature.featureKey, feature])
  );

  return MAIN_HOME_FEATURES.map((mainFeature) => {
    const sourceFeatures = mainFeature.sourceFeatureKeys
      .map((featureKey) => featureByKey.get(featureKey))
      .filter(Boolean);
    const primaryFeature = sourceFeatures[0];
    const future = mainFeature.future ?? primaryFeature?.future ?? false;
    const permissions = buildPermissions(
      permissionMap,
      mainFeature.sourceFeatureKeys,
      hasPermission
    );

    return {
      feature_key: mainFeature.featureKey,
      title: mainFeature.title,
      description: mainFeature.description ?? primaryFeature?.description,
      route_path: mainFeature.routePath ?? primaryFeature?.routePath,
      enabled:
        mainFeature.enabled ??
        sourceFeatures.some((feature) => feature.enabled) ??
        false,
      future,
      permissions,
      summary: future
        ? { status: "Upcoming" }
        : mainFeature.summary ?? {},
    };
  })
    .filter((feature) => feature.permissions.view || feature.future);
}

module.exports = {
  HOME_FEATURE_ACTIONS,
  MAIN_HOME_FEATURES,
  buildHomeFeatureResponse,
};
