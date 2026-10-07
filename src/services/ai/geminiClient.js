const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * geminiClient.js — Centralized Google Gemini AI Client (Part 3 & 4)
 * Supports configurable model, JSON response format, retry cascade with 10s timeout,
 * and seamless fallback on quota/auth/network constraints.
 */

const getGeminiModel = (options = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const modelName = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens || options.max_tokens || 8192,
    },
  });
};

/**
 * Helper to execute with timeout
 */
const withTimeout = (promise, ms = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ]);
};

/**
 * Executes a structured JSON AI completion with the Google Gemini API.
 * Accepts OpenAI-style messages array:
 *   [{ role: 'system', content: '...' }, { role: 'user', content: '...' }]
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {object} options - { temperature, max_tokens, model }
 * @returns {Promise<object|null>} Parsed JSON object, or null on error
 */
const requestJsonCompletion = async (messages, options = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.warn('[Gemini] GEMINI_API_KEY is not configured. Activating intelligent fallback engine.');
    return null;
  }

  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  const systemInstruction = systemMessages.map(m => m.content).join('\n\n');
  const promptParts = conversationMessages.map(m => m.content).join('\n\n');

  // Candidate models: gemini-3.5-flash-lite is highest-availability, followed by gemini-3.8-flash, etc.
  const configuredModel = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const modelCandidates = [
    configuredModel,
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-pro-latest'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const genAI = new GoogleGenerativeAI(apiKey.trim());

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || undefined,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.max_tokens || options.maxOutputTokens || 8192,
        },
      });

      console.log(`[Gemini] Invoking model: ${modelName} | prompt: ${promptParts.length} chars`);

      const result = await withTimeout(model.generateContent(promptParts), 12000);
      const responseText = result.response.text();

      if (!responseText || responseText.trim() === '') {
        throw new Error('Gemini returned an empty response.');
      }

      console.log(`[Gemini] Response received (${responseText.length} chars).`);

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        // Strip any markdown code fences if wrapped
        const stripped = responseText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        return JSON.parse(stripped);
      }
    } catch (error) {
      const msg = error.message || String(error);
      console.warn(`[Gemini] Model ${modelName} failed: ${msg.slice(0, 140)}`);

      // If it was a 404, 503, timeout, or similar, try the next candidate
      if (
        msg.includes('404') ||
        msg.includes('503') ||
        msg.includes('Timeout') ||
        msg.includes('not found') ||
        msg.includes('no longer available')
      ) {
        continue;
      }

      // If quota/rate limit or network error, stop and return null to activate intelligent fallback
      if (
        error.status === 429 ||
        error.status === 401 ||
        error.status === 403 ||
        msg.includes('quota') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('rate limit') ||
        msg.includes('API_KEY_INVALID')
      ) {
        console.warn('[Gemini] Quota, rate limit, or auth restriction reached. Activating intelligent deterministic engine.');
        return null;
      }
    }
  }

  // If all candidate models were exhausted
  console.warn('[Gemini] Candidate models exhausted. Seamlessly activating intelligent deterministic fallback engine.');
  return null;
};

module.exports = {
  getGeminiModel,
  requestJsonCompletion,
};
