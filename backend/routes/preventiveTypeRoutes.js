const express = require('express');
const router = express.Router();
const preventiveTypeController = require('../controllers/preventiveTypeController');

const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, preventiveTypeController.getAllTypes);
router.post('/', authenticateToken, authorizeRole('ADMIN'), preventiveTypeController.createType);
router.put('/:id', authenticateToken, authorizeRole('ADMIN'), preventiveTypeController.updateType);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), preventiveTypeController.deleteType);

router.post('/:id/checklists', authenticateToken, authorizeRole('ADMIN'), preventiveTypeController.addMasterChecklist);
router.put('/checklists/reorder', authenticateToken, authorizeRole('ADMIN'), preventiveTypeController.reorderMasterChecklists);
router.put('/checklists/:itemId', authenticateToken, authorizeRole('ADMIN'), preventiveTypeController.updateMasterChecklist);
router.delete('/checklists/:itemId', authenticateToken, authorizeRole('ADMIN'), preventiveTypeController.deleteMasterChecklist);

module.exports = router;
