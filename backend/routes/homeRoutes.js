const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const homeController = require("../controllers/homeController");

router.get("/features", authenticateToken, homeController.getFeatures);

module.exports = router;
