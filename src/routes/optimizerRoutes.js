const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  analyzeJob,
  detectGaps,
  confirmFacts,
  getConfirmedFacts,
  runOptimization
} = require('../controllers/optimizerController');

router.use(protect);

router.post('/analyze-job', aiLimiter, analyzeJob);
router.post('/detect-gaps', aiLimiter, detectGaps);
router.post('/confirm-facts', confirmFacts);
router.get('/confirmed-facts/:cvId', getConfirmedFacts);
router.post('/run', aiLimiter, runOptimization);

module.exports = router;
