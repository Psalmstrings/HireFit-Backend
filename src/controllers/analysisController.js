const CV = require('../models/CV');
const Job = require('../models/Job');
const CVAnalysis = require('../models/CVAnalysis');
const CVVersion = require('../models/CVVersion');
const { compareCvAndJobWithAI } = require('../services/ai/matchingService');
const { optimizeCvWithAI } = require('../services/ai/cvOptimizationService');
const { analyzeSkillsGap } = require('../services/ai/skillsGapService');

// @desc Run CV vs Job Analysis
// @route POST /api/analysis/:cvId/:jobId
const runAnalysis = async (req, res, next) => {
  try {
    const { cvId, jobId } = req.params;

    const cv = await CV.findOne({ _id: cvId, userId: req.user.id });
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });

    const job = await Job.findOne({ _id: jobId, userId: req.user.id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.', code: 'JOB_NOT_FOUND' });

    if (!cv.isParsed || !cv.parsedData) {
      return res.status(400).json({
        success: false,
        message: 'CV must be parsed before analysis. Please parse your CV first.',
        code: 'CV_NOT_PARSED'
      });
    }

    // Check for existing recent analysis (within 24h) to avoid duplicate AI calls
    const existingAnalysis = await CVAnalysis.findOne({
      userId: req.user.id,
      cvId,
      jobId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (existingAnalysis && !req.query.force) {
      return res.json({
        success: true,
        message: 'Retrieved existing analysis. Pass ?force=true to regenerate.',
        analysis: existingAnalysis,
        cached: true
      });
    }

    // Run AI matching
    const matchResult = await compareCvAndJobWithAI(cv.parsedData, job.structuredData);

    // Run skills gap analysis
    const skillsGap = await analyzeSkillsGap(cv.parsedData, job.structuredData);

    const analysis = await CVAnalysis.create({
      userId: req.user.id,
      cvId,
      jobId,
      overallScore: matchResult.overallScore,
      scoreLabel: matchResult.scoreLabel,
      categoryScores: matchResult.categoryScores,
      matchedSkills: matchResult.matchedSkills,
      partialMatches: matchResult.partialMatches,
      missingSkills: matchResult.missingSkills,
      evidenceGaps: matchResult.evidenceGaps,
      strengths: matchResult.strengths,
      recommendations: matchResult.recommendations,
      atsChecklist: matchResult.atsChecklist
    });

    // Attach skills gap to analysis response
    const analysisObj = analysis.toObject();
    analysisObj.skillsGap = skillsGap;

    // Increment AI usage
    await require('../models/User').findByIdAndUpdate(req.user.id, { $inc: { aiUsageCount: 1 } });

    res.status(201).json({ success: true, message: 'CV analysis complete.', analysis: analysisObj });
  } catch (err) {
    next(err);
  }
};

// @desc Get analysis by id
// @route GET /api/analysis/:id
const getAnalysis = async (req, res, next) => {
  try {
    const analysis = await CVAnalysis.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('cvId', 'title')
      .populate('jobId', 'title company');

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found.', code: 'ANALYSIS_NOT_FOUND' });
    }

    res.json({ success: true, analysis });
  } catch (err) {
    next(err);
  }
};

// @desc Get all analyses for user
// @route GET /api/analysis
const getAnalyses = async (req, res, next) => {
  try {
    const analyses = await CVAnalysis.find({ userId: req.user.id })
      .populate('cvId', 'title')
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, count: analyses.length, analyses });
  } catch (err) {
    next(err);
  }
};

// @desc Optimize CV for a specific job
// @route POST /api/cvs/:id/optimize
const optimizeCV = async (req, res, next) => {
  try {
    const { jobId, jobDescription, jobTitle, companyName, jobUrl, versionName } = req.body;

    if (!jobId && !jobDescription) {
      return res.status(400).json({
        success: false,
        message: 'Either jobId or jobDescription is required.',
        code: 'MISSING_JOB_INPUT'
      });
    }

    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });

    if (!cv.isParsed || !cv.parsedData) {
      return res.status(400).json({ success: false, message: 'CV must be parsed before optimization.', code: 'CV_NOT_PARSED' });
    }

    let job;
    let jobStructuredData;

    if (jobId) {
      // Use existing job record
      job = await Job.findOne({ _id: jobId, userId: req.user.id });
      if (!job) return res.status(404).json({ success: false, message: 'Job not found.', code: 'JOB_NOT_FOUND' });
      jobStructuredData = job.structuredData;
    } else {
      // Parse the inline job description with AI, then save it as a Job record
      const { parseJobWithAI } = require('../services/ai/jobParserService');
      let parsed;
      try {
        parsed = await parseJobWithAI(jobDescription);
      } catch (e) {
        // Fallback minimal structured data
        parsed = {
          jobTitle: jobTitle || 'Target Role',
          company: companyName || '',
          requiredSkills: [],
          preferredSkills: [],
          responsibilities: [],
          qualifications: [],
          experienceLevel: '',
          employmentType: '',
          location: '',
          salary: '',
          benefits: []
        };
      }

      if (jobTitle) parsed.jobTitle = jobTitle;
      if (companyName) parsed.company = companyName;

      // Upsert: find recent identical job or create new
      job = await Job.create({
        userId: req.user.id,
        title: parsed.jobTitle || jobTitle || 'Target Role',
        company: parsed.company || companyName || '',
        rawText: jobDescription,
        structuredData: parsed,
        isParsed: true
      });

      jobStructuredData = parsed;
    }

    // Get latest analysis or use empty
    const latestAnalysis = await CVAnalysis.findOne({ cvId: cv._id, jobId: job._id }).sort({ createdAt: -1 });

    // Run matching for match score
    let matchResult = null;
    try {
      const { compareCvAndJobWithAI } = require('../services/ai/matchingService');
      matchResult = await compareCvAndJobWithAI(cv.parsedData, jobStructuredData);
    } catch (e) {
      // Non-fatal — optimizer can proceed without a match score
    }

    const { optimizedCv, changes, preservedSections = [], improvedSections = [] } = await optimizeCvWithAI(
      cv.parsedData,
      jobStructuredData,
      latestAnalysis || {}
    );

    // Save optimized version — ORIGINAL parsedData is NEVER overwritten
    const versionCount = await CVVersion.countDocuments({ cvId: cv._id });
    const resolvedVersionName = versionName ||
      `Optimized for ${jobStructuredData?.jobTitle || job.title}${jobStructuredData?.company ? ' at ' + jobStructuredData.company : ''}`;

    const newVersion = await CVVersion.create({
      cvId: cv._id,
      userId: req.user.id,
      versionNumber: versionCount + 1,
      label: resolvedVersionName,
      versionName: resolvedVersionName,
      targetJobId: job._id,
      targetJobTitle: jobStructuredData?.jobTitle || job.title,
      targetCompany: jobStructuredData?.company || job.company || '',
      jobDescription: jobId ? (job.rawText || '') : jobDescription,
      originalSnapshot: JSON.parse(JSON.stringify(cv.parsedData)),
      cvData: optimizedCv,
      optimizedContent: optimizedCv,
      changesSummary: changes,
      preservedSections,
      improvedSections,
      matchScore: matchResult?.overallScore || null,
      analysis: matchResult || null
    });

    cv.versionsCount = versionCount + 1;
    cv.activeVersionId = newVersion._id;
    await cv.save();

    await require('../models/User').findByIdAndUpdate(req.user.id, { $inc: { aiUsageCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'CV optimized successfully.',
      version: newVersion,
      originalMasterCv: cv.parsedData,
      optimizedCv,
      changes,
      preservedSections,
      improvedSections,
      matchScore: matchResult?.overallScore || null,
      matchResult
    });
  } catch (err) {
    next(err);
  }
};

// @desc Update change status in a version (accept/reject)
// @route PUT /api/analysis/changes/:versionId
const updateChangeStatus = async (req, res, next) => {
  try {
    const { changeIndex, status } = req.body;
    const version = await CVVersion.findOne({ _id: req.params.versionId, userId: req.user.id });
    if (!version) return res.status(404).json({ success: false, message: 'Version not found.', code: 'VERSION_NOT_FOUND' });

    if (version.changesSummary && version.changesSummary[changeIndex] !== undefined) {
      version.changesSummary[changeIndex].status = status;
      await version.save();
    }

    res.json({ success: true, message: 'Change status updated.', version });
  } catch (err) {
    next(err);
  }
};

module.exports = { runAnalysis, getAnalysis, getAnalyses, optimizeCV, updateChangeStatus };
