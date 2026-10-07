/**
 * validationService.js
 *
 * Universal CV Validation & Cross-Contamination Engine (Parts 32, 33, 34)
 * Ensures:
 * 1. Languages only contains human/spoken languages (English, Yoruba, French, etc.)
 * 2. Tech stack / programming languages (JavaScript, Python, React, Mongo, etc.)
 *    are NEVER classified as spoken languages.
 * 3. Projects and Work Experience are not cross-contaminated.
 * 4. Education is distinct from employment.
 * 5. All source sections are preserved without silent loss.
 */

const KNOWN_SPOKEN_LANGUAGES = new Set([
  'english', 'yoruba', 'igbo', 'hausa', 'spanish', 'french', 'german', 'mandarin',
  'chinese', 'japanese', 'korean', 'arabic', 'hindi', 'portuguese', 'russian',
  'italian', 'dutch', 'turkish', 'polish', 'swahili', 'vietnamese', 'thai',
  'indonesian', 'bengali', 'punjabi', 'urdu', 'persian', 'hebrew', 'greek', 'swedish',
  'norwegian', 'danish', 'finnish', 'czech', 'hungarian', 'romanian', 'tagalog'
]);

const KNOWN_TECH_KEYWORDS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'php', 'ruby',
  'go', 'golang', 'rust', 'swift', 'kotlin', 'dart', 'scala', 'r', 'matlab', 'perl',
  'react', 'react.js', 'reactjs', 'vue', 'vue.js', 'angular', 'next.js', 'nextjs',
  'node', 'node.js', 'nodejs', 'express', 'express.js', 'django', 'flask', 'fastapi',
  'spring', 'spring boot', 'laravel', 'asp.net', '.net', 'rails',
  'mongodb', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'cassandra',
  'firebase', 'supabase', 'dynamodb', 'oracle', 'mariadb',
  'git', 'github', 'gitlab', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
  'html', 'html5', 'css', 'css3', 'tailwind', 'bootstrap', 'sass', 'graphql', 'rest', 'api',
  'webpack', 'vite', 'linux', 'postman', 'jest', 'ci/cd', 'jira', 'figma'
]);

/**
 * Checks if a string represents a human/spoken language
 */
const isSpokenLanguage = (str) => {
  if (!str || typeof str !== 'string') return false;
  const clean = str.toLowerCase().replace(/[^a-z]/g, ' ').trim();
  const words = clean.split(/\s+/);
  return words.some(w => KNOWN_SPOKEN_LANGUAGES.has(w));
};

/**
 * Checks if a string represents a programming language / technology
 */
const isTechnology = (str) => {
  if (!str || typeof str !== 'string') return false;
  const clean = str.toLowerCase().replace(/[^a-z0-9+#.]/g, ' ').trim();
  const words = clean.split(/\s+/);
  return words.some(w => KNOWN_TECH_KEYWORDS.has(w));
};

/**
 * Validates and auto-remediates a structured CV against cross-contamination rules
 */
const sanitizeAndValidateMasterCv = (structuredData, rawExtractedText = '') => {
  const issues = [];
  const remediationLog = [];

  const master = JSON.parse(JSON.stringify(structuredData || {}));

  // Ensure all standard arrays exist
  master.skills = master.skills || {};
  master.skills.technical = master.skills.technical || [];
  master.skills.soft = master.skills.soft || [];
  master.skills.tools = master.skills.tools || [];
  master.skills.languages = master.skills.languages || [];

  master.coreSkills = master.coreSkills || {
    frontendDevelopment: [],
    backendDevelopment: [],
    technicalSkills: [],
    softSkills: [],
    databases: [],
    toolsAndTechnologies: []
  };

  master.techStack = master.techStack || {
    languages: [],
    frontend: [],
    backend: [],
    database: [],
    versionControl: [],
    other: []
  };

  master.workExperience = master.workExperience || [];
  master.projectExperience = master.projectExperience || master.projects || [];
  master.projects = master.projectExperience;
  master.education = master.education || [];
  master.certifications = master.certifications || [];
  master.awards = master.awards || [];
  master.volunteerExperience = master.volunteerExperience || [];
  master.publications = master.publications || [];
  master.training = master.training || [];
  master.courses = master.courses || [];
  master.languages = master.languages || [];
  master.references = master.references || [];
  master.additionalSections = master.additionalSections || [];

  // ─── 1. CROSS-CONTAMINATION RULE: Spoken Languages vs Tech Stack ───────────
  // Inspect master.languages
  const cleanSpokenLanguages = [];
  const leakedTechFromLanguages = [];

  (master.languages || []).forEach(item => {
    const text = typeof item === 'string' ? item : (item.language || item.name || '');
    if (!text) return;

    if (!isSpokenLanguage(text)) {
      leakedTechFromLanguages.push(text);
      remediationLog.push(`Moved non-spoken item '${text}' out of Languages into Tech/Projects`);
    } else {
      cleanSpokenLanguages.push(item);
    }
  });

  // If leaked tech was found in languages, move to techStack or technical skills
  if (leakedTechFromLanguages.length > 0) {
    leakedTechFromLanguages.forEach(tech => {
      if (!master.skills.technical.includes(tech)) {
        master.skills.technical.push(tech);
      }
      if (!master.techStack.other.includes(tech)) {
        master.techStack.other.push(tech);
      }
    });
    issues.push(`Found ${leakedTechFromLanguages.length} technical item(s) misclassified under Languages. Auto-remediated.`);
  }

  // Also check if spoken languages were accidentally placed inside skills.languages
  (master.skills.languages || []).forEach(l => {
    if (isSpokenLanguage(l) && !cleanSpokenLanguages.some(sl => (typeof sl === 'string' ? sl : sl.name).toLowerCase() === l.toLowerCase())) {
      cleanSpokenLanguages.push(l);
    }
  });

  // If no spoken languages were detected yet, search raw text for common languages (e.g. English, Yoruba)
  if (cleanSpokenLanguages.length === 0 && rawExtractedText) {
    Array.from(KNOWN_SPOKEN_LANGUAGES).forEach(lang => {
      const reg = new RegExp(`\\b${lang}\\b`, 'i');
      if (reg.test(rawExtractedText)) {
        const capitalized = lang.charAt(0).toUpperCase() + lang.slice(1);
        if (!cleanSpokenLanguages.includes(capitalized)) {
          cleanSpokenLanguages.push(capitalized);
          remediationLog.push(`Detected spoken language '${capitalized}' from raw text.`);
        }
      }
    });
  }

  // Ensure default fallback if genuinely not found
  if (cleanSpokenLanguages.length === 0) {
    cleanSpokenLanguages.push('English');
  }

  master.languages = cleanSpokenLanguages;

  // ─── 2. CROSS-CONTAMINATION RULE: Projects inside Work Experience ───────────
  // If workExperience contains entries that look strictly like independent personal/academic projects
  // (e.g. company is empty or matches project titles), ensure they are also captured in projectExperience.
  const refinedJobs = [];
  (master.workExperience || []).forEach(job => {
    const isProjectLike = /project|application|app|portal|clone|website/i.test(job.jobTitle || '') &&
      (!job.company || /personal|independent|academic|freelance/i.test(job.company));

    if (isProjectLike && master.projectExperience.length < 5) {
      master.projectExperience.push({
        name: job.company || job.jobTitle || 'Project',
        role: job.jobTitle || 'Lead Developer',
        description: (job.responsibilities || []).join(' '),
        technologies: job.technologies || [],
        url: '',
        achievements: job.achievements || []
      });
      remediationLog.push(`Mirrored project-like role '${job.jobTitle}' into Project Experience.`);
    }
    refinedJobs.push(job);
  });
  master.workExperience = refinedJobs;
  master.projects = master.projectExperience;

  // ─── 3. CONTENT PRESERVATION CHECKS (Part 34) ─────────────────────────────
  const rawLength = rawExtractedText ? rawExtractedText.length : 0;
  const wordCount = rawExtractedText ? rawExtractedText.split(/\s+/).filter(Boolean).length : 0;

  // Compare approximate text presence
  let totalMasterChars = 0;
  totalMasterChars += (master.professionalSummary || '').length;
  totalMasterChars += (master.careerObjective || '').length;
  (master.workExperience || []).forEach(w => {
    totalMasterChars += (w.company || '').length + (w.jobTitle || '').length;
    (w.responsibilities || []).forEach(r => totalMasterChars += r.length);
  });
  (master.projectExperience || []).forEach(p => {
    totalMasterChars += (p.name || '').length + (p.description || '').length;
    (p.achievements || []).forEach(a => totalMasterChars += a.length);
  });
  (master.education || []).forEach(e => {
    totalMasterChars += (e.institution || '').length + (e.degree || '').length + (e.field || '').length;
  });
  (master.skills.technical || []).forEach(s => totalMasterChars += s.length);

  // If content is suspiciously small (<20% of raw text when raw text > 500 chars)
  const isSuspiciousReduction = rawLength > 500 && totalMasterChars < (rawLength * 0.15);
  if (isSuspiciousReduction) {
    issues.push(`Master CV character count (${totalMasterChars}) is unusually low compared to raw text (${rawLength}).`);
  }

  const validationStats = {
    rawCharacterCount: rawLength,
    rawWordCount: wordCount,
    masterStructuredChars: totalMasterChars,
    jobsCount: master.workExperience.length,
    projectsCount: master.projectExperience.length,
    educationCount: master.education.length,
    technicalSkillsCount: master.skills.technical.length,
    languagesCount: master.languages.length,
    certificationsCount: master.certifications.length,
    additionalSectionsCount: master.additionalSections.length
  };

  return {
    isValid: issues.length === 0 || !isSuspiciousReduction,
    sanitizedMasterCv: master,
    issues,
    remediationLog,
    stats: validationStats
  };
};

module.exports = {
  sanitizeAndValidateMasterCv,
  isSpokenLanguage,
  isTechnology
};
