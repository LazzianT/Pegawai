const express = require('express');
const { authenticate } = require('../middleware/auth');
const { registerTokenHandler, removeTokenHandler } = require('../controllers/deviceTokenController');

const router = express.Router();

router.post('/token', authenticate, registerTokenHandler);
router.post('/token/remove', authenticate, removeTokenHandler);

module.exports = router;
