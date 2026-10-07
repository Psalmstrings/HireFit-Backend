const CV = require('../models/CV');
const Job = require('../models/Job');
const CoverLetter = require('../models/CoverLetter');
const InterviewSession = require('../models/InterviewSession');
const { generateCoverLetterWithAI } = require('../services/ai/coverLetterService');
const { generateInterviewQuestionsWithAI } = require('../services/ai/interviewService');

// @desc Generate cover letter
// @route POST /api/cover-letters/generate
const generateCoverLetter = async (req, res, next) => {
  try {
    const { cvId, jobId, tone, recipientName } = req.body;

    if (!cvId || !jobId) {
      return res.status(400).json({ success: false, message: 'cvId and jobId are required.', code: 'MISSING_FIELDS' });
    }

    const cv = await CV.findOne({ _id: cvId, userId: req.user.id });
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });

    const job = await Job.findOne({ _id: jobId, userId: req.user.id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.', code: 'JOB_NOT_FOUND' });

    const result = await generateCoverLetterWithAI(cv.parsedData, job.structuredData, tone || 'professional');

    const coverLetter = await CoverLetter.create({
      userId: req.user.id,
      cvId,
      jobId,
      company: job.structuredData?.company || job.company,
      jobTitle: job.structuredData?.jobTitle || job.title,
      recipientName: recipientName || 'Hiring Manager',
      content: result.content,
      tone: tone || 'professional'
    });

    await require('../models/User').findByIdAndUpdate(req.user.id, { $inc: { aiUsageCount: 1 } });

    res.status(201).json({ success: true, message: 'Cover letter generated.', coverLetter, keyHighlights: result.keyHighlights });
  } catch (err) {
    next(err);
  }
};

// @desc Get cover letters
// @route GET /api/cover-letters
const getCoverLetters = async (req, res, next) => {
  try {
    const letters = await CoverLetter.find({ userId: req.user.id })
      .populate('cvId', 'title')
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: letters.length, coverLetters: letters });
  } catch (err) {
    next(err);
  }
};

// @desc Update cover letter content
// @route PUT /api/cover-letters/:id
const updateCoverLetter = async (req, res, next) => {
  try {
    const letter = await CoverLetter.findOne({ _id: req.params.id, userId: req.user.id });
    if (!letter) return res.status(404).json({ success: false, message: 'Cover letter not found.', code: 'NOT_FOUND' });

    if (req.body.content) letter.content = req.body.content;
    await letter.save();

    res.json({ success: true, message: 'Cover letter updated.', coverLetter: letter });
  } catch (err) {
    next(err);
  }
};

// @desc Delete cover letter
// @route DELETE /api/cover-letters/:id
const deleteCoverLetter = async (req, res, next) => {
  try {
    await CoverLetter.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true, message: 'Cover letter deleted.' });
  } catch (err) {
    next(err);
  }
};

// @desc Generate interview questions
// @route POST /api/interviews/generate
const generateInterviewQuestions = async (req, res, next) => {
  try {
    const { cvId, jobId } = req.body;

    if (!cvId || !jobId) {
      return res.status(400).json({ success: false, message: 'cvId and jobId are required.', code: 'MISSING_FIELDS' });
    }

    const cv = await CV.findOne({ _id: cvId, userId: req.user.id });
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });

    const job = await Job.findOne({ _id: jobId, userId: req.user.id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.', code: 'JOB_NOT_FOUND' });

    const result = await generateInterviewQuestionsWithAI(cv.parsedData, job.structuredData);

    const session = await InterviewSession.create({
      userId: req.user.id,
      cvId,
      jobId,
      company: job.structuredData?.company || job.company,
      jobTitle: job.structuredData?.jobTitle || job.title,
      questions: result.questions
    });

    await require('../models/User').findByIdAndUpdate(req.user.id, { $inc: { aiUsageCount: 1 } });

    res.status(201).json({ success: true, message: 'Interview questions generated.', session });
  } catch (err) {
    next(err);
  }
};

// @desc Get interview sessions
// @route GET /api/interviews
const getInterviewSessions = async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find({ userId: req.user.id })
      .populate('cvId', 'title')
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: sessions.length, sessions });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateCoverLetter,
  getCoverLetters,
  updateCoverLetter,
  deleteCoverLetter,
  generateInterviewQuestions,
  getInterviewSessions
};
