const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, uploadController.uploadImage, uploadController.handleUpload);

module.exports = router;
