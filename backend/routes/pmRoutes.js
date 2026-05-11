const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { loadAssignedMachines } = require('../middleware/rbacMiddleware');
const pmController = require('../controllers/pmController');

router.get('/global-status', authenticateToken, loadAssignedMachines, pmController.getMachineStatusOverview);
router.get('/schedule', authenticateToken, loadAssignedMachines, pmController.getSchedule);
router.get('/dashboard-stats', authenticateToken, loadAssignedMachines, pmController.getDashboardStats);
router.get('/records/:id', authenticateToken, pmController.getRecord);
router.get('/machine/:machineId/history', authenticateToken, loadAssignedMachines, pmController.getMachineHistory);
router.post('/record', authenticateToken, pmController.recordPM);
router.put('/records/:id', authenticateToken, pmController.updateRecord);
router.delete('/records/:id', authenticateToken, pmController.deleteRecord);
router.get('/analysis/machine', authenticateToken, loadAssignedMachines, pmController.getMachineAnalysis);
router.get('/analysis/failure-breakdown', authenticateToken, loadAssignedMachines, pmController.getFailureBreakdown);
router.get('/analysis/operator', authenticateToken, loadAssignedMachines, pmController.getOperatorAnalysis);
router.post('/reschedule', authenticateToken, pmController.reschedulePM);

module.exports = router;
