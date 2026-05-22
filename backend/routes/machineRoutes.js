const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');

const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const { loadAssignedMachines } = require('../middleware/rbacMiddleware');

router.get('/types', machineController.getMachineTypes);
router.get('/dropdown', authenticateToken, loadAssignedMachines, machineController.getMachinesDropdown);
router.get('/', authenticateToken, machineController.getMachines);
router.get('/:id', authenticateToken, loadAssignedMachines, machineController.getMachineById);
router.post('/bulk', authenticateToken, authorizeRole('ADMIN'), machineController.createMachinesBulk);
router.post('/', authenticateToken, authorizeRole('ADMIN'), machineController.createMachine);
router.put('/:id', authenticateToken, authorizeRole('ADMIN'), machineController.updateMachine);
router.delete('/plans/:planId', authenticateToken, authorizeRole('ADMIN'), machineController.deleteMachinePMPlan);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), machineController.deleteMachine);

module.exports = router;
