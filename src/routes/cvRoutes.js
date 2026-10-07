const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadCV, getCVs, getCV, updateCV, renameCV, deleteCV, parseCV,
  getCVVersions, restoreCVVersion
} = require('../controllers/cvController');
const { optimizeCV } = require('../controllers/analysisController');
const { aiLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.route('/')
  .get(getCVs)
  .post(upload.single('file'), uploadCV);

router.post('/upload', upload.single('file'), uploadCV);

router.route('/:id')
  .get(getCV)
  .put(updateCV)
  .delete(deleteCV);

router.patch('/:id/rename', renameCV);
router.post('/:id/parse', aiLimiter, parseCV);
router.post('/:id/optimize', aiLimiter, optimizeCV);

router.get('/:id/versions', getCVVersions);
router.post('/:id/versions/:versionId/restore', restoreCVVersion);

module.exports = router;
