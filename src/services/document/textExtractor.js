const { extractDocumentContent } = require('./documentExtractionService');

/**
 * textExtractor.js — Backward-compatible wrapper delegating to documentExtractionService
 */
const extractTextFromBuffer = async (fileBuffer, originalname, mimetype) => {
  return extractDocumentContent(fileBuffer, originalname, mimetype);
};

module.exports = {
  extractTextFromBuffer,
  extractDocumentContent
};
