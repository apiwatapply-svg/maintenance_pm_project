const express = require('express');
const router = express.Router();
const machineMasterController = require('../controllers/machineMasterController');

const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, machineMasterController.getAll);
router.post('/', authenticateToken, authorizeRole('ADMIN'), machineMasterController.create);
router.put('/:id', authenticateToken, authorizeRole('ADMIN'), machineMasterController.update);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), machineMasterController.delete);

module.exports = router;
