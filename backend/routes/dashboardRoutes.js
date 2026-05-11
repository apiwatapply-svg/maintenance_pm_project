const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

const { authenticateToken } = require('../middleware/authMiddleware');
const { loadAssignedMachines } = require('../middleware/rbacMiddleware');

router.get('/stats', authenticateToken, loadAssignedMachines, dashboardController.getDashboardStats);
// [FIX BUG-2] Added loadAssignedMachines so non-admin users only see stats for their assigned machines
router.get('/operator-stats', authenticateToken, loadAssignedMachines, dashboardController.getOperatorStats);

module.exports = router;
