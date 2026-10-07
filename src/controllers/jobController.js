const Job = require('../models/Job');
const { extractTextFromBuffer } = require('../services/document/textExtractor');
const { parseJobWithAI } = require('../services/ai/jobParserService');

// @desc Create job from pasted text
// @route POST /api/jobs
const createJob = async (req, res, next) => {
  try {
    const { rawText, title } = req.body;

    if (!rawText || rawText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Job description text is too short. Please provide a complete job posting.',
        code: 'INSUFFICIENT_JOB_TEXT'
      });
    }

    // Parse with AI
    const structuredData = await parseJobWithAI(rawText);

    const job = await Job.create({
      userId: req.user.id,
      title: title || structuredData.jobTitle || 'Job Description',
      company: structuredData.company || 'Hiring Company',
      rawText,
      structuredData,
      isParsed: true,
      sourceType: 'pasted'
    });

    res.status(201).json({
      success: true,
      message: 'Job description analyzed successfully.',
      job
    });
  } catch (err) {
    next(err);
  }
};

// @desc Create job from uploaded document
// @route POST /api/jobs/upload
const uploadJob = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.', code: 'NO_FILE' });
    }

    const { originalname, mimetype, buffer } = req.file;

    let extractedText = '';
    try {
      const result = await extractTextFromBuffer(buffer, originalname, mimetype);
      extractedText = result.text;
    } catch (extractErr) {
      return res.status(400).json({
        success: false,
        message: extractErr.message,
        code: extractErr.code || 'TEXT_EXTRACTION_FAILED'
      });
    }

    const structuredData = await parseJobWithAI(extractedText);

    const job = await Job.create({
      userId: req.user.id,
      title: req.body.title || structuredData.jobTitle || 'Uploaded Job Description',
      company: structuredData.company || 'Hiring Company',
      rawText: extractedText,
      structuredData,
      isParsed: true,
      sourceType: 'uploaded'
    });

    res.status(201).json({ success: true, message: 'Job description uploaded and analyzed.', job });
  } catch (err) {
    next(err);
  }
};

// @desc Get all jobs for user
// @route GET /api/jobs
const getJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ userId: req.user.id })
      .select('-rawText')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    next(err);
  }
};

// @desc Get single job
// @route GET /api/jobs/:id
const getJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.', code: 'JOB_NOT_FOUND' });
    }
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

// @desc Delete job
// @route DELETE /api/jobs/:id
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.', code: 'JOB_NOT_FOUND' });
    }
    res.json({ success: true, message: 'Job deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createJob, uploadJob, getJobs, getJob, deleteJob };
