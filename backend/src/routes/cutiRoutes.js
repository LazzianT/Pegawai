const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getSaldoHandler, getTransactionsHandler, getAtasanHandler, submitLeaveHandler, getApprovalCutiHandler, approveCutiHandler } = require('../controllers/cutiController');

const router = express.Router();

router.use(authenticate);

router.get('/saldo', getSaldoHandler);
router.get('/transaksi', getTransactionsHandler);
router.get('/atasan', getAtasanHandler);
router.post('/submit', submitLeaveHandler);
router.get('/approval/cuti', getApprovalCutiHandler);
router.post('/approval/approve', approveCutiHandler);

module.exports = router;
