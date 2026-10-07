const path = require('path');
const CV = require('../models/CV');
const CVVersion = require('../models/CVVersion');
const CVAnalysis = require('../models/CVAnalysis');
const { extractTextFromBuffer } = require('../services/document/textExtractor');
const { uploadDocument, deleteDocument } = require('../services/cloudinary/cloudinaryService');
const { parseCvWithAI } = require('../services/ai/cvParserService');

// @desc Upload CV
// @route POST /api/cvs/upload
const uploadCV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.', code: 'NO_FILE' });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    const title = req.body.title || path.parse(originalname).name;
    const targetRole = req.body.targetRole || '';

    // 1. Extract text from document
    let extractionResult;
    try {
      extractionResult = await extractTextFromBuffer(buffer, originalname, mimetype);
    } catch (extractErr) {
      return res.status(400).json({
        success: false,
        message: extractErr.message,
        code: extractErr.code || 'TEXT_EXTRACTION_FAILED'
      });
    }

    const {
      text: extractedText,
      totalPages = 1,
      processedPages = 1,
      extractedCharacterCount = 0,
      extractedWordCount = 0,
      documentStructure = null
    } = extractionResult;

    // 2. Upload file to Cloudinary or local
    const fileUpload = await uploadDocument(buffer, originalname, mimetype);

    // 3. Create CV record with complete master metadata
    const cv = await CV.create({
      userId: req.user.id,
      title,
      name: title,
      targetRole,
      originalFile: {
        url: fileUpload.url,
        publicId: fileUpload.publicId,
        fileName: originalname,
        fileType: mimetype,
        fileSize: size,
        storageType: fileUpload.storageType
      },
      extractedRawText: extractedText,
      originalExtractedText: extractedText,
      documentStructure,
      parsingMetadata: {
        totalPages,
        processedPages,
        extractedCharacterCount,
        extractedWordCount,
        parserVersion: '2.0.0-master',
        parsingStatus: 'extracting',
        extractedAt: new Date()
      },
      isParsed: false,
      parseStatus: 'extracting'
    });

    // 4. Create initial version (Master Snapshot)
    const version = await CVVersion.create({
      cvId: cv._id,
      userId: req.user.id,
      versionNumber: 1,
      label: 'Master CV Upload',
      versionName: 'Master CV (Original)',
      originalSnapshot: {},
      cvData: {}
    });

    cv.activeVersionId = version._id;
    await cv.save();

    // 5. Parse CV with AI (async but we await it for initial upload)
    try {
      cv.parseStatus = 'parsed';
      cv.parsingMetadata.parsingStatus = 'parsed';
      const parsedData = await parseCvWithAI(extractedText, documentStructure);
      cv.parsedData = parsedData;
      cv.isParsed = true;
      cv.parseError = null;

      // Auto-derive targetRole from parsedData if not explicitly provided
      if (!targetRole && parsedData.targetRoles && parsedData.targetRoles.length > 0) {
        cv.targetRole = parsedData.targetRoles[0];
      }

      // Update version with complete master parsed data
      version.cvData = parsedData;
      version.originalSnapshot = parsedData;
      await version.save();
    } catch (parseErr) {
      cv.parseStatus = 'failed';
      cv.parsingMetadata.parsingStatus = 'failed';
      cv.parseError = parseErr.message;
    }

    await cv.save();

    res.status(201).json({
      success: true,
      message: 'CV uploaded and Master record created successfully.',
      cv: {
        id: cv._id,
        title: cv.title,
        name: cv.title,
        targetRole: cv.targetRole,
        isParsed: cv.isParsed,
        parseStatus: cv.parseStatus,
        parsingMetadata: cv.parsingMetadata,
        parsedData: cv.parsedData,
        originalFile: {
          url: cv.originalFile.url,
          fileName: cv.originalFile.fileName,
          fileType: cv.originalFile.fileType,
          fileSize: cv.originalFile.fileSize,
          storageType: cv.originalFile.storageType
        },
        versionsCount: cv.versionsCount,
        createdAt: cv.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all CVs for user
// @route GET /api/cvs
const getCVs = async (req, res, next) => {
  try {
    const cvs = await CV.find({ userId: req.user.id })
      .select('-extractedRawText')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: cvs.length, cvs });
  } catch (err) {
    next(err);
  }
};

// @desc Get single CV
// @route GET /api/cvs/:id
const getCV = async (req, res, next) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) {
      return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });
    }
    res.json({ success: true, cv });
  } catch (err) {
    next(err);
  }
};

// @desc Update CV (title, parsedData, template, targetRole)
// @route PUT /api/cvs/:id
const updateCV = async (req, res, next) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) {
      return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });
    }

    const { title, targetRole, parsedData, selectedTemplate } = req.body;

    if (title !== undefined) cv.title = title;
    if (targetRole !== undefined) cv.targetRole = targetRole;
    if (selectedTemplate) cv.selectedTemplate = selectedTemplate;
    if (parsedData) {
      cv.parsedData = parsedData;
      // Create a new version for manually edited CV data
      const versionCount = await CVVersion.countDocuments({ cvId: cv._id });
      const version = await CVVersion.create({
        cvId: cv._id,
        userId: req.user.id,
        versionNumber: versionCount + 1,
        label: `Manual Edit v${versionCount + 1}`,
        cvData: parsedData
      });
      cv.versionsCount = versionCount + 1;
      cv.activeVersionId = version._id;
    }

    await cv.save();
    res.json({ success: true, message: 'CV updated successfully.', cv });
  } catch (err) {
    next(err);
  }
};

// @desc Rename a CV (title + targetRole only, no version bump)
// @route PATCH /api/cvs/:id/rename
const renameCV = async (req, res, next) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) {
      return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });
    }

    const { title, targetRole } = req.body;
    if (!title && targetRole === undefined) {
      return res.status(400).json({ success: false, message: 'Provide at least a title or targetRole to update.', code: 'NOTHING_TO_UPDATE' });
    }

    if (title) cv.title = title.trim();
    if (targetRole !== undefined) cv.targetRole = targetRole.trim();

    await cv.save();
    res.json({ success: true, message: 'CV renamed successfully.', cv });
  } catch (err) {
    next(err);
  }
};

// @desc Delete CV
// @route DELETE /api/cvs/:id
const deleteCV = async (req, res, next) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) {
      return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });
    }

    // Delete file from storage
    await deleteDocument(cv.originalFile.publicId, cv.originalFile.storageType);

    // Cascade delete versions and analyses
    await CVVersion.deleteMany({ cvId: cv._id });
    await CVAnalysis.deleteMany({ cvId: cv._id });
    await cv.deleteOne();

    res.json({ success: true, message: 'CV and all associated data deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// @desc Re-parse a CV
// @route POST /api/cvs/:id/parse
const parseCV = async (req, res, next) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) {
      return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });
    }

    if (!cv.extractedRawText || cv.extractedRawText.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient text extracted from this CV to parse.',
        code: 'INSUFFICIENT_TEXT'
      });
    }

    cv.parseStatus = 'extracting';
    await cv.save();

    const parsedData = await parseCvWithAI(cv.extractedRawText, cv.documentStructure);
    cv.parsedData = parsedData;
    cv.isParsed = true;
    cv.parseStatus = 'parsed';
    cv.parseError = null;
    await cv.save();

    res.json({ success: true, message: 'CV parsed successfully.', parsedData });
  } catch (err) {
    next(err);
  }
};

// @desc Get CV versions
// @route GET /api/cvs/:id/versions
const getCVVersions = async (req, res, next) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) {
      return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });
    }

    const versions = await CVVersion.find({ cvId: cv._id })
      .sort({ versionNumber: -1 })
      .populate('targetJobId', 'title company');

    res.json({ success: true, count: versions.length, versions });
  } catch (err) {
    next(err);
  }
};

// @desc Restore a CV version
// @route POST /api/cvs/:id/versions/:versionId/restore
const restoreCVVersion = async (req, res, next) => {
  try {
    const cv = await CV.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cv) {
      return res.status(404).json({ success: false, message: 'CV not found.', code: 'CV_NOT_FOUND' });
    }

    const version = await CVVersion.findOne({ _id: req.params.versionId, cvId: cv._id });
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found.', code: 'VERSION_NOT_FOUND' });
    }

    cv.parsedData = version.cvData;
    cv.activeVersionId = version._id;
    await cv.save();

    res.json({ success: true, message: `Restored to version: ${version.label}`, cv });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadCV, getCVs, getCV, updateCV, renameCV, deleteCV, parseCV, getCVVersions, restoreCVVersion };
