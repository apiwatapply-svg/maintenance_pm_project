const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildHomeFeatureResponse,
} = require("../../backend/services/homeFeature.service");
const { hasPermission } = require("../../backend/services/permission.service");

test("builds feature cards from permissions", () => {
  const features = [
    {
      featureKey: "dashboard",
      title: "Realtime Dashboard",
      description: "Live status",
      routePath: "/dashboard",
      enabled: true,
      future: false,
    },
  ];

  const result = buildHomeFeatureResponse(
    features,
    { "dashboard.view": true },
    hasPermission
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].feature_key, "dashboard");
  assert.equal(result[0].permissions.view, true);
  assert.deepEqual(result[0].summary, {});
});

test("keeps future feature card visible with future summary", () => {
  const features = [
    {
      featureKey: "predictive",
      title: "Predictive Maintenance",
      description: "Future module",
      routePath: "/predictive-future",
      enabled: false,
      future: true,
    },
  ];

  const result = buildHomeFeatureResponse(features, {}, hasPermission);

  assert.equal(result.length, 1);
  assert.equal(result[0].feature_key, "predictive");
  assert.equal(result[0].enabled, false);
  assert.equal(result[0].future, true);
  assert.deepEqual(result[0].summary, { status: "Future" });
});

test("hides non-future features without view permission", () => {
  const features = [
    {
      featureKey: "setting",
      title: "Settings",
      description: "System settings",
      routePath: "/settings",
      enabled: true,
      future: false,
    },
  ];

  const result = buildHomeFeatureResponse(features, {}, hasPermission);

  assert.equal(result.length, 0);
});
