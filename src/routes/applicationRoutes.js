const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getApplications, createApplication, updateApplication, deleteApplication
} = require('../controllers/applicationController');

router.use(protect);
router.route('/').get(getApplications).post(createApplication);
router.route('/:id').put(updateApplication).delete(deleteApplication);

module.exports = router;
