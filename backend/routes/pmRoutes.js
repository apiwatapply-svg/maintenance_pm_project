const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { loadAssignedMachines } = require('../middleware/rbacMiddleware');
const pmController = require('../controllers/pmController');

router.get('/global-status', authenticateToken, loadAssignedMachines, pmController.getMachineStatusOverview);
router.get('/schedule', authenticateToken, loadAssignedMachines, pmController.getSchedule);
router.get('/dashboard-stats', authenticateToken, loadAssignedMachines, pmController.getDashboardStats);
router.get('/records/:id', authenticateToken, loadAssignedMachines, pmController.getRecord);
router.get('/machine/:machineId/history', authenticateToken, loadAssignedMachines, pmController.getMachineHistory);
router.post('/record', authenticateToken, loadAssignedMachines, pmController.recordPM);
router.put('/records/:id', authenticateToken, loadAssignedMachines, pmController.updateRecord);
router.delete('/records/:id', authenticateToken, loadAssignedMachines, pmController.deleteRecord);
router.get('/analysis/machine', authenticateToken, loadAssignedMachines, pmController.getMachineAnalysis);
router.get('/analysis/failure-breakdown', authenticateToken, loadAssignedMachines, pmController.getFailureBreakdown);
router.get('/analysis/operator', authenticateToken, loadAssignedMachines, pmController.getOperatorAnalysis);
router.post('/reschedule', authenticateToken, loadAssignedMachines, pmController.reschedulePM);

module.exports = router;
