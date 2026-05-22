const express = require('express');
const router = express.Router();
const { getHolidays, createHoliday, updateHoliday, deleteHoliday } = require('../controllers/holidayController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

router.get('/', getHolidays);
router.post('/', authenticateToken, authorizeRole('ADMIN'), createHoliday);
router.put('/:id', authenticateToken, authorizeRole('ADMIN'), updateHoliday);
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), deleteHoliday);

module.exports = router;

