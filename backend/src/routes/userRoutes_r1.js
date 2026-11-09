const express = require('express');
const {
  loginHandler,
  getUsersHandler,
  healthHandler,
  getProfileHandler,
  updateEmailHandler,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/health', healthHandler);
router.post('/login', loginHandler);
router.get('/users', getUsersHandler);
router.get('/profile', authenticate, getProfileHandler);
router.put('/profile/email', authenticate, updateEmailHandler);

module.exports = router;
