const User = require('../models/User');
const CV = require('../models/CV');
const Job = require('../models/Job');
const CVAnalysis = require('../models/CVAnalysis');
const Application = require('../models/Application');
const CoverLetter = require('../models/CoverLetter');
const InterviewSession = require('../models/InterviewSession');

// @desc Get admin dashboard statistics & usage telemetry
// @route GET /api/admin/stats
const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      adminUsers,
      totalCVs,
      totalJobs,
      totalAnalyses,
      totalApplications,
      totalCoverLetters,
      totalInterviews
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ role: 'admin' }),
      CV.countDocuments(),
      Job.countDocuments(),
      CVAnalysis.countDocuments(),
      Application.countDocuments(),
      CoverLetter.countDocuments(),
      InterviewSession.countDocuments()
    ]);

    // Average match score across all analyses
    const avgScoreResult = await CVAnalysis.aggregate([
      { $group: { _id: null, avg: { $avg: '$overallScore' } } }
    ]);
    const avgMatchScore = avgScoreResult[0]?.avg ? Math.round(avgScoreResult[0].avg) : 0;

    // Total AI invocations across platform
    const aiUsageResult = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$aiUsageCount' } } }
    ]);
    const totalAiInvocations = aiUsageResult[0]?.total || 0;

    // Match score distribution
    const [highMatchCount, midMatchCount, lowMatchCount] = await Promise.all([
      CVAnalysis.countDocuments({ overallScore: { $gte: 80 } }),
      CVAnalysis.countDocuments({ overallScore: { $gte: 60, $lt: 80 } }),
      CVAnalysis.countDocuments({ overallScore: { $lt: 60 } })
    ]);

    // Recent platform events feed (unified chronological events)
    const [recentUsers, recentCVs, recentAnalyses, recentApps] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(6).select('name email role isVerified createdAt lastLogin'),
      CV.find().sort({ createdAt: -1 }).limit(5).select('title userId createdAt'),
      CVAnalysis.find().sort({ createdAt: -1 }).limit(5).select('overallScore userId createdAt').populate('jobId', 'title company'),
      Application.find().sort({ createdAt: -1 }).limit(5).select('company jobTitle status userId appliedDate')
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        adminUsers,
        totalCVs,
        totalJobs,
        totalAnalyses,
        totalApplications,
        totalCoverLetters,
        totalInterviews,
        avgMatchScore,
        totalAiInvocations,
        scoreDistribution: {
          high: highMatchCount,
          medium: midMatchCount,
          low: lowMatchCount
        },
        recentUsers,
        recentCVs,
        recentAnalyses,
        recentApps
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all users with aggregated activity metrics
// @route GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { q, role, verified, sort = 'createdAt', order = 'desc' } = req.query;

    const filter = {};
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (verified !== undefined && verified !== 'all') {
      filter.isVerified = verified === 'true';
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const users = await User.find(filter)
      .select('-password')
      .sort({ [sort]: sortOrder })
      .lean();

    // Aggregate user activity counts
    const userIds = users.map(u => u._id);

    const [cvCounts, jobCounts, analysisCounts, appCounts, letterCounts] = await Promise.all([
      CV.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]),
      Job.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]),
      CVAnalysis.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]),
      Application.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]),
      CoverLetter.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }])
    ]);

    const countMap = (arr) => arr.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const cvMap = countMap(cvCounts);
    const jobMap = countMap(jobCounts);
    const analysisMap = countMap(analysisCounts);
    const appMap = countMap(appCounts);
    const letterMap = countMap(letterCounts);

    const enrichedUsers = users.map(user => {
      const uid = user._id.toString();
      return {
        ...user,
        cvCount: cvMap[uid] || 0,
        jobCount: jobMap[uid] || 0,
        analysisCount: analysisMap[uid] || 0,
        applicationCount: appMap[uid] || 0,
        coverLetterCount: letterMap[uid] || 0,
        aiUsageCount: user.aiUsageCount || 0
      };
    });

    res.json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get detailed activity for a single user
// @route GET /api/admin/users/:id/activity
const getUserActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    const [cvs, jobs, analyses, applications, coverLetters, interviews] = await Promise.all([
      CV.find({ userId: user._id }).sort({ createdAt: -1 }).select('title isParsed parseStatus versionsCount createdAt'),
      Job.find({ userId: user._id }).sort({ createdAt: -1 }).select('title company sourceType createdAt'),
      CVAnalysis.find({ userId: user._id }).sort({ createdAt: -1 }).populate('cvId', 'title').populate('jobId', 'title company').select('overallScore categoryScores createdAt'),
      Application.find({ userId: user._id }).sort({ createdAt: -1 }).select('company jobTitle status appliedDate createdAt'),
      CoverLetter.find({ userId: user._id }).sort({ createdAt: -1 }).select('jobTitle company tone createdAt'),
      InterviewSession.find({ userId: user._id }).sort({ createdAt: -1 }).select('jobTitle company questions createdAt')
    ]);

    res.json({
      success: true,
      user,
      activity: {
        cvs,
        jobs,
        analyses,
        applications,
        coverLetters,
        interviews
      }
    });
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

    // Safety: Prevent removing admin role from the primary admin
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    if (targetUser.email === 'psalmtringsdigital@gmail.com' && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke administrator role from primary admin account.',
        code: 'PROTECTED_ADMIN'
      });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({
      success: true,
      message: `User role updated to ${role}.`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Toggle verification status for user
// @route PUT /api/admin/users/:id/verify
const toggleUserVerification = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    targetUser.isVerified = !targetUser.isVerified;
    if (targetUser.isVerified) {
      targetUser.verificationToken = undefined;
      targetUser.verificationTokenExpire = undefined;
    }
    await targetUser.save();

    res.json({
      success: true,
      message: `User verification set to ${targetUser.isVerified ? 'Verified' : 'Unverified'}.`,
      isVerified: targetUser.isVerified
    });
  } catch (err) {
    next(err);
  }
};

// @desc Delete user and related data
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    if (targetUser.email === 'psalmtringsdigital@gmail.com') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the primary administrator account.',
        code: 'PROTECTED_ADMIN'
      });
    }

    // Cascade clean up user's data
    await Promise.all([
      CV.deleteMany({ userId: targetUser._id }),
      Job.deleteMany({ userId: targetUser._id }),
      CVAnalysis.deleteMany({ userId: targetUser._id }),
      Application.deleteMany({ userId: targetUser._id }),
      CoverLetter.deleteMany({ userId: targetUser._id }),
      InterviewSession.deleteMany({ userId: targetUser._id }),
      User.findByIdAndDelete(targetUser._id)
    ]);

    res.json({ success: true, message: `User "${targetUser.name}" and associated records deleted.` });
  } catch (err) {
    next(err);
  }
};

// @desc Export telemetry and user summary
// @route GET /api/admin/export
const exportTelemetry = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    const userIds = users.map(u => u._id);

    const [cvs, jobs, analyses, applications] = await Promise.all([
      CV.find({ userId: { $in: userIds } }).select('userId title createdAt').lean(),
      Job.find({ userId: { $in: userIds } }).select('userId title company createdAt').lean(),
      CVAnalysis.find({ userId: { $in: userIds } }).select('userId overallScore createdAt').lean(),
      Application.find({ userId: { $in: userIds } }).select('userId company jobTitle status appliedDate').lean()
    ]);

    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        totalCVs: cvs.length,
        totalJobs: jobs.length,
        totalAnalyses: analyses.length,
        totalApplications: applications.length
      },
      users,
      records: {
        cvs,
        jobs,
        analyses,
        applications
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  getUserActivity,
  updateUserRole,
  toggleUserVerification,
  deleteUser,
  exportTelemetry
};
