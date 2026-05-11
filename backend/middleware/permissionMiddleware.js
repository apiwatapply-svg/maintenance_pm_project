const prisma = require("../prismaClient");
const {
  canBypassPermission,
  hasAnyPermission,
  hasPermission,
  mergePermissions,
} = require("../services/permission.service");

async function loadUserPermissionMap(userId) {
  const userRoles = await prisma.appUserRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: {
                include: { feature: true },
              },
            },
          },
        },
      },
    },
  });

  const overrides = await prisma.appUserFeatureOverride.findMany({
    where: { userId },
    include: { feature: true },
  });

  const rolePermissions = userRoles.flatMap((userRole) =>
    userRole.role.permissions.map((rolePermission) => ({
      featureKey: rolePermission.permission.feature.featureKey,
      action: rolePermission.permission.action,
      allowed: rolePermission.allowed,
    }))
  );

  return mergePermissions({
    rolePermissions,
    overrides: overrides.map((override) => ({
      featureKey: override.feature.featureKey,
      action: override.action,
      allowed: override.allowed,
    })),
  });
}

function requirePermission(featureKey, action) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required.",
            details: [],
          },
        });
      }

      if (canBypassPermission(req.user)) {
        req.permissions = {};
        return next();
      }

      const permissions = await loadUserPermissionMap(req.user.id);

      if (!hasPermission(permissions, featureKey, action)) {
        return res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You do not have permission.",
            details: [],
          },
        });
      }

      req.permissions = permissions;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireAnyPermission(requiredPermissions) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required.",
            details: [],
          },
        });
      }

      if (canBypassPermission(req.user)) {
        req.permissions = {};
        return next();
      }

      const permissions = await loadUserPermissionMap(req.user.id);
      const allowed = hasAnyPermission(permissions, requiredPermissions);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You do not have permission.",
            details: [],
          },
        });
      }

      req.permissions = permissions;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  loadUserPermissionMap,
  requireAnyPermission,
  requirePermission,
};
