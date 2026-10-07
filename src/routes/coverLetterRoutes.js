const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  generateCoverLetter,
  getCoverLetters,
  updateCoverLetter,
  deleteCoverLetter
} = require('../controllers/coverLetterController');

router.use(protect);

router.route('/')
  .get(getCoverLetters);

router.post('/generate', aiLimiter, generateCoverLetter);

router.route('/:id')
  .put(updateCoverLetter)
  .delete(deleteCoverLetter);

module.exports = router;
