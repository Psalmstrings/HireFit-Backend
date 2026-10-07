const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { createJob, uploadJob, getJobs, getJob, deleteJob } = require('../controllers/jobController');
const { aiLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.route('/')
  .get(getJobs)
  .post(aiLimiter, createJob);

router.post('/upload', aiLimiter, upload.single('file'), uploadJob);

router.route('/:id')
  .get(getJob)
  .delete(deleteJob);

module.exports = router;
