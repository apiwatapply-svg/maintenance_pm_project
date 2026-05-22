const express = require('express');
const router = express.Router();
const controller = require('../controllers/additionalDefaultController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { loadAssignedMachines } = require('../middleware/rbacMiddleware');

// GET /api/additional-defaults/:machineId/:typeId
router.get('/:machineId/:typeId', authenticateToken, loadAssignedMachines, controller.getDefaults);

// POST /api/additional-defaults
router.post('/', authenticateToken, loadAssignedMachines, controller.saveDefaults);

module.exports = router;
