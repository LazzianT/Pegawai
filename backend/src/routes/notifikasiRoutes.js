const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getNotificationsHandler, markAllReadHandler } = require('../controllers/notifikasiController');

const router = express.Router();

router.use(authenticate);

router.get('/', getNotificationsHandler);
router.post('/read', markAllReadHandler);

module.exports = router;
