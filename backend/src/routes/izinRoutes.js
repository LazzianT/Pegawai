const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getTransactionsHandler, getKeperluanHandler, submitIzinHandler, getApprovalIzinHandler, approveIzinHandler } = require('../controllers/izinController');

const router = express.Router();

router.use(authenticate);

router.get('/transaksi', getTransactionsHandler);
router.get('/keperluan', getKeperluanHandler);
router.get('/approval/izin', getApprovalIzinHandler);
router.post('/approval/approve', approveIzinHandler);
router.post('/submit', submitIzinHandler);

module.exports = router;