const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  generateInterviewQuestions,
  getInterviewSessions
} = require('../controllers/coverLetterController');

router.use(protect);

router.get('/', getInterviewSessions);
router.post('/generate', aiLimiter, generateInterviewQuestions);

module.exports = router;
