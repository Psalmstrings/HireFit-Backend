const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { runAnalysis, getAnalysis, getAnalyses, updateChangeStatus } = require('../controllers/analysisController');
const { aiLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.get('/', getAnalyses);
router.post('/:cvId/:jobId', aiLimiter, runAnalysis);
router.get('/:id', getAnalysis);
router.put('/changes/:versionId', updateChangeStatus);

module.exports = router;
