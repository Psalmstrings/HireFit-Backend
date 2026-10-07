const Application = require('../models/Application');

// @desc Get all applications for user
// @route GET /api/applications
const getApplications = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user.id };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('cvId', 'title')
      .populate('jobId', 'title company')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    next(err);
  }
};

// @desc Create application
// @route POST /api/applications
const createApplication = async (req, res, next) => {
  try {
    const { company, jobTitle, jobUrl, location, salary, status, cvId, cvVersionId, jobId, matchScore, appliedDate, notes } = req.body;

    if (!company || !jobTitle) {
      return res.status(400).json({ success: false, message: 'Company and job title are required.', code: 'MISSING_FIELDS' });
    }

    const application = await Application.create({
      userId: req.user.id,
      company,
      jobTitle,
      jobUrl,
      location,
      salary,
      status: status || 'Saved',
      cvId: cvId || null,
      cvVersionId: cvVersionId || null,
      jobId: jobId || null,
      matchScore,
      appliedDate,
      notes
    });

    res.status(201).json({ success: true, message: 'Application saved.', application });
  } catch (err) {
    next(err);
  }
};

// @desc Update application
// @route PUT /api/applications/:id
const updateApplication = async (req, res, next) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, userId: req.user.id });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.', code: 'NOT_FOUND' });
    }

    const fields = ['company', 'jobTitle', 'jobUrl', 'location', 'salary', 'status', 'cvId', 'cvVersionId', 'matchScore', 'appliedDate', 'notes'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) application[f] = req.body[f];
    });

    await application.save();
    res.json({ success: true, message: 'Application updated.', application });
  } catch (err) {
    next(err);
  }
};

// @desc Delete application
// @route DELETE /api/applications/:id
const deleteApplication = async (req, res, next) => {
  try {
    const application = await Application.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.', code: 'NOT_FOUND' });
    }
    res.json({ success: true, message: 'Application deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getApplications, createApplication, updateApplication, deleteApplication };
