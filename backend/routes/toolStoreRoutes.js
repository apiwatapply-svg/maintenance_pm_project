const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAnyPermission } = require('../middleware/permissionMiddleware');
const toolStoreController = require('../controllers/toolStoreController');

router.use(authenticateToken);

router.get('/options', requireAnyPermission([['tooling', 'view'], ['spare_part', 'view']]), toolStoreController.getOptions);
router.get('/items', requireAnyPermission([['tooling', 'view'], ['spare_part', 'view']]), toolStoreController.listItems);
router.post('/items', requireAnyPermission([['tooling', 'create'], ['spare_part', 'create']]), toolStoreController.createItem);
router.get('/scan/:scanCode', requireAnyPermission([['tooling', 'view'], ['spare_part', 'view']]), toolStoreController.findByScanCode);
router.get('/transactions', requireAnyPermission([['tooling', 'view'], ['spare_part', 'view']]), toolStoreController.listTransactions);
router.post('/transactions', requireAnyPermission([['tooling', 'edit'], ['spare_part', 'edit']]), toolStoreController.createTransaction);

module.exports = router;
