const prisma = require('../prismaClient');

/**
 * RBAC Middleware - Loads assigned machine IDs for non-admin users.
 * After this middleware, req.assignedMachineIds is:
 *   - null  → Admin user (no filter needed)
 *   - []    → Non-admin with no machines assigned
 *   - [1,2] → Non-admin with specific machine access
 */
const loadAssignedMachines = async (req, res, next) => {
    try {
        if (req.user && req.user.systemRole !== 'ADMIN') {
            const user = await prisma.userMaster.findUnique({
                where: { id: req.user.id },
                select: { assignedMachines: { select: { id: true } } }
            });
            req.assignedMachineIds = user?.assignedMachines.map(m => m.id) || [];
        } else {
            req.assignedMachineIds = null; // null = admin, no filter
        }
        next();
    } catch (error) {
        console.error('RBAC middleware error:', error);
        req.assignedMachineIds = []; // [FIX] Lock access on error — safer than undefined (which bypasses filters)
        next();
    }
};

module.exports = { loadAssignedMachines };
