const express = require('express');
const router = express.Router();
const machineTypeController = require('../controllers/machineTypeController');

const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, machineTypeController.getAllMachineTypes);
router.post('/', authenticateToken, authorizeRole('ADMIN'), machineTypeController.createMachineType);
router.put('/:id', authenticateToken, authorizeRole('ADMIN'), machineTypeController.updateMachineType);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), machineTypeController.deleteMachineType);

module.exports = router;
