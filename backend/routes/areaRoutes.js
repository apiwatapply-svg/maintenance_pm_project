const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');

const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, areaController.getAreas);
router.post('/', authenticateToken, authorizeRole('ADMIN'), areaController.createArea);
router.put('/:id', authenticateToken, authorizeRole('ADMIN'), areaController.updateArea);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), areaController.deleteArea);

module.exports = router;
