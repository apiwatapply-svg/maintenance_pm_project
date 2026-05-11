const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildHomeFeatureResponse,
} = require("../../backend/services/homeFeature.service");
const { hasPermission } = require("../../backend/services/permission.service");

test("builds the four main module cards from permissions", () => {
  const features = [
    {
      featureKey: "dashboard",
      title: "Dashboard",
      routePath: "/dashboard",
      enabled: true,
      future: false,
    },
    {
      featureKey: "preventive",
      title: "Preventive Maintenance",
      routePath: "/pm",
      enabled: true,
      future: false,
    },
    {
      featureKey: "tooling",
      title: "Tooling Storage",
      routePath: "/tooling",
      enabled: true,
      future: false,
    },
    {
      featureKey: "spare_part",
      title: "Spare Part Inventory",
      routePath: "/spare-parts",
      enabled: true,
      future: false,
    },
    {
      featureKey: "job_request",
      title: "Job Request",
      routePath: "/job-requests",
      enabled: true,
      future: false,
    },
  ];

  const result = buildHomeFeatureResponse(
    features,
    {
      "dashboard.view": true,
      "preventive.view": true,
      "tooling.view": true,
      "spare_part.view": true,
      "job_request.view": true,
      "job_request.create": true,
    },
    hasPermission
  );

  assert.deepEqual(
    result.map((feature) => feature.feature_key),
    ["preventive", "predictive", "tool_store", "job_request"]
  );
  assert.equal(result[0].title, "Preventive Maintenance");
  assert.equal(result[0].route_path, "/machines/overall");
  assert.equal(result[1].summary.status, "Upcoming");
  assert.equal(result[2].title, "Tooling & Store");
  assert.equal(result[2].permissions.view, true);
  assert.equal(result[3].permissions.create, true);
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
  assert.deepEqual(result[0].summary, { status: "Upcoming" });
});

test("hides normal main cards without view permission but keeps upcoming predictive", () => {
  const features = [
    {
      featureKey: "preventive",
      title: "Preventive Maintenance",
      routePath: "/pm",
      enabled: true,
      future: false,
    },
  ];

  const result = buildHomeFeatureResponse(features, {}, hasPermission);

  assert.deepEqual(
    result.map((feature) => feature.feature_key),
    ["predictive"]
  );
  assert.equal(result[0].future, true);
});
