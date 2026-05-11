const prisma = require("../prismaClient");
const { loadUserPermissionMap } = require("../middleware/permissionMiddleware");
const { hasPermission } = require("../services/permission.service");
const { buildHomeFeatureResponse } = require("../services/homeFeature.service");

exports.getFeatures = async (req, res, next) => {
  try {
    const permissionMap = await loadUserPermissionMap(req.user.id);
    const features = await prisma.appFeature.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const data = buildHomeFeatureResponse(features, permissionMap, hasPermission);

    res.json({ success: true, data, message: "OK" });
  } catch (error) {
    next(error);
  }
};
