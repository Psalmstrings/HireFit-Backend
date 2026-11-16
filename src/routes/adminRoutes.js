const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const {
  getAdminStats,
  getUsers,
  getUserActivity,
  updateUserRole,
  toggleUserVerification,
  deleteUser,
  exportTelemetry
} = require('../controllers/adminController');

router.use(protect, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.get('/users/:id/activity', getUserActivity);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/verify', toggleUserVerification);
router.delete('/users/:id', deleteUser);
router.get('/export', exportTelemetry);

module.exports = router;
