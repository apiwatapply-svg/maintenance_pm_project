const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');

const { authenticateToken } = require('../middleware/authMiddleware');
const { loadAssignedMachines } = require('../middleware/rbacMiddleware');

router.get('/types', machineController.getMachineTypes);
router.get('/dropdown', authenticateToken, loadAssignedMachines, machineController.getMachinesDropdown);
router.get('/', authenticateToken, machineController.getMachines);
router.get('/:id', machineController.getMachineById);
router.post('/bulk', machineController.createMachinesBulk);
router.post('/', machineController.createMachine);
router.put('/:id', machineController.updateMachine);
router.delete('/plans/:planId', machineController.deleteMachinePMPlan);
router.delete('/:id', machineController.deleteMachine);

module.exports = router;
