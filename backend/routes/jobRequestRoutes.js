const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { loadAssignedMachines } = require('../middleware/rbacMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const jobRequestController = require('../controllers/jobRequestController');

router.use(authenticateToken);

router.get('/options', loadAssignedMachines, requirePermission('job_request', 'view'), jobRequestController.getOptions);
router.get('/', requirePermission('job_request', 'view'), jobRequestController.listJobRequests);
router.post('/', requirePermission('job_request', 'create'), jobRequestController.createJobRequest);
router.get('/:id', requirePermission('job_request', 'view'), jobRequestController.getJobRequest);
router.put('/:id', requirePermission('job_request', 'edit'), jobRequestController.updateJobRequest);
router.post('/:id/comment', requirePermission('job_request', 'edit'), jobRequestController.addComment);

module.exports = router;
