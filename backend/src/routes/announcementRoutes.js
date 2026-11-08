const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAnnouncementsHandler } = require('../controllers/announcementController');

const router = express.Router();

router.get('/', authenticate, getAnnouncementsHandler);

module.exports = router;
