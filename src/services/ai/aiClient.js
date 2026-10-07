/**
 * aiClient.js — Legacy compatibility shim.
 * All AI functionality has been migrated to geminiClient.js (Google Gemini API).
 * This file re-exports everything from geminiClient so existing imports continue to work.
 */
module.exports = require('./geminiClient');
