const User = require('../models/User');
const CV = require('../models/CV');
const Job = require('../models/Job');
const CVAnalysis = require('../models/CVAnalysis');
const Application = require('../models/Application');

// @desc Get admin dashboard statistics
// @route GET /api/admin/stats
const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalCVs, totalJobs, totalAnalyses, totalApplications] = await Promise.all([
      User.countDocuments(),
      CV.countDocuments(),
      Job.countDocuments(),
      CVAnalysis.countDocuments(),
      Application.countDocuments()
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select('name email role createdAt aiUsageCount');
    const avgScoreResult = await CVAnalysis.aggregate([
      { $group: { _id: null, avg: { $avg: '$overallScore' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCVs,
        totalJobs,
        totalAnalyses,
        totalApplications,
        avgMatchScore: avgScoreResult[0]?.avg ? Math.round(avgScoreResult[0].avg) : 0,
        recentUsers
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all users (admin)
// @route GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// @desc Update user role (admin)
// @route PUT /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.', code: 'INVALID_ROLE' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });

    res.json({ success: true, message: `User role updated to ${role}.`, user });
  } catch (err) {
    next(err);
  }
};

// @desc Delete user (admin)
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminStats, getUsers, updateUserRole, deleteUser };
