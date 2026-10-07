const { requestJsonCompletion } = require('./geminiClient');
const { sanitizeAndValidateMasterCv, isSpokenLanguage, isTechnology } = require('./validationService');

const CV_PARSER_SYSTEM_PROMPT = `
You are a professional CV document extraction engine (Master CV Ingestion).

Your job is to accurately understand, structure, and preserve ALL substantive information from the supplied CV.

STRICT INSTRUCTIONS:
1. This is NOT a summarization task.
2. This is NOT an optimization task.
3. This is NOT a rewriting task.
4. This is NOT a relevance-filtering task.
5. Extract ALL substantive information without loss.
6. Respect original section boundaries, wording, relationships, and chronological order.
7. NEVER remove information because you believe it is irrelevant or older.
8. NEVER invent information or infer unsupported facts.
9. NEVER merge unrelated sections.
10. NEVER move information into a category merely because another category exists.

CRITICAL DISTINCTIONS:
- HUMAN SPOKEN LANGUAGES: Only place spoken human communication languages (e.g., English, Yoruba, Spanish, French, German, Mandarin, etc.) into the "languages" array.
- PROGRAMMING LANGUAGES & TECH: Place programming languages (e.g., JavaScript, TypeScript, Python), frontend tools (React, HTML/CSS), backend tools (Node.js, Express), and databases (MongoDB, PostgreSQL) strictly into "techStack" or "skills.technical" / "coreSkills". NEVER put programming languages into the "languages" section.
- PROJECT EXPERIENCE vs WORK EXPERIENCE: If the CV has a dedicated "Project Experience" or "Projects" section, preserve each project in "projectExperience" (with name, role, description, technologies, achievements). Preserve employment in "workExperience". If there is only project experience, preserve it in "projectExperience".
- CORE SKILLS & TECH STACK: If the CV has "Tech Stack" or "Core Skills" broken down into Frontend, Backend, Databases, Tools, preserve them inside "coreSkills" and "techStack".
- PRESERVE UNKNOWN SECTIONS: If a section is not standard (e.g., "PUBLICATIONS", "VOLUNTEER", "KEY ACHIEVEMENTS", or a custom header), place it in "additionalSections". NEVER discard it.

STRICT JSON OUTPUT FORMAT:
{
  "personalInfo": {
    "fullName": "Candidate Full Name",
    "email": "email@example.com",
    "phone": "+1 234 567 8900",
    "location": "City, Country or Remote",
    "linkedin": "linkedin.com/in/username or empty",
    "portfolio": "portfolio or personal website or empty",
    "github": "github.com/username or empty"
  },
  "professionalTitle": "Professional Title (e.g. Fullstack Developer, Software Engineer)",
  "professionalSummary": "Complete exact professional summary as written by the candidate (DO NOT SUMMARIZE OR SHORTEN)",
  "careerObjective": "Complete exact career objective if present, otherwise empty string",
  "targetRoles": ["Role 1", "Role 2"],
  "skills": {
    "technical": ["Technical Skill 1", "Technical Skill 2"],
    "soft": ["Soft Skill 1", "Soft Skill 2"],
    "tools": ["Tool 1", "Tool 2"],
    "languages": []
  },
  "coreSkills": {
    "frontendDevelopment": ["React", "HTML5", "CSS3"],
    "backendDevelopment": ["Node.js", "Express.js"],
    "technicalSkills": ["REST APIs", "Git"],
    "softSkills": ["Collaboration", "Problem Solving"],
    "databases": ["MongoDB", "PostgreSQL"],
    "toolsAndTechnologies": ["VS Code", "Postman", "Git"]
  },
  "techStack": {
    "languages": ["JavaScript", "TypeScript"],
    "frontend": ["React", "Tailwind CSS"],
    "backend": ["Node.js", "Express"],
    "database": ["MongoDB", "PostgreSQL"],
    "versionControl": ["Git", "GitHub"],
    "other": ["RESTful APIs"]
  },
  "workExperience": [
    {
      "company": "Company Name",
      "jobTitle": "Job Title",
      "location": "Location or Remote",
      "startDate": "Start Date",
      "endDate": "End Date or Present",
      "current": false,
      "responsibilities": ["Full Responsibility Bullet 1", "Full Responsibility Bullet 2"],
      "achievements": ["Full Achievement Bullet 1"],
      "technologies": ["Tech 1", "Tech 2"]
    }
  ],
  "projectExperience": [
    {
      "name": "Project Name",
      "role": "Role (e.g. Lead Developer)",
      "description": "Complete description of project",
      "technologies": ["Tech 1", "Tech 2"],
      "url": "Project URL or GitHub link if present",
      "achievements": ["Achievement bullet 1", "Achievement bullet 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "role": "Role",
      "description": "Description",
      "technologies": ["Tech 1"],
      "url": "",
      "achievements": []
    }
  ],
  "education": [
    {
      "institution": "University / College / Polytechnic",
      "degree": "Degree / Diploma / Certificate",
      "field": "Field of Study",
      "startDate": "Start Date or empty",
      "endDate": "End Date / Year"
    }
  ],
  "certifications": ["Certification 1", "Certification 2"],
  "awards": ["Award 1"],
  "achievements": ["Achievement 1"],
  "volunteerExperience": ["Volunteer role 1"],
  "publications": ["Publication 1"],
  "training": ["Training course 1"],
  "courses": ["Course 1"],
  "languages": ["English", "Yoruba"],
  "professionalMemberships": ["Membership 1"],
  "references": ["Available upon request"],
  "additionalSections": [
    {
      "sectionTitle": "Custom Section Heading",
      "content": "Full original content..."
    }
  ]
}
`;

/**
 * Universal Section-Based Deterministic Master CV Extractor.
 * Dynamically detects headings without assuming layout or ordering.
 * Strictly separates spoken languages from programming languages/tech stacks.
 */
const fallbackParseCv = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Personal Information Extraction
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  const phoneMatch = rawText.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : '';

  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  const github = githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : '';

  const fullName = lines.length > 0 ? lines[0].replace(/[#*]/g, '').trim() : 'Candidate';

  // Extract professional title if present near header (e.g. Fullstack Developer)
  let professionalTitle = '';
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const l = lines[i];
    if (
      /developer|engineer|designer|manager|architect|analyst|specialist|consultant|administrator|technologist|scientist/i.test(l) &&
      !l.includes('@') && !l.includes('http') && l.length < 60
    ) {
      professionalTitle = l.replace(/[#*|]/g, '').trim();
      break;
    }
  }

  // 2. Comprehensive Section Header Definitions
  // Notice: 'languages' requires strictly spoken language cues or being isolated from tech keywords
  const SECTION_RULES = [
    { key: 'summary', regex: /^(?:professional\s+)?(?:summary|profile|about\s+me|overview)\b/i },
    { key: 'objective', regex: /^(?:career\s+)?objective\b/i },
    { key: 'experience', regex: /^(?:work|professional|career|employment)\s*(?:experience|history|employment)\b/i },
    { key: 'projects', regex: /^(?:project\s+experience|key\s+projects|featured\s+projects|personal\s+projects|projects|portfolio)\b/i },
    { key: 'techStack', regex: /^(?:tech\s+stack|technical\s+stack|technology\s+stack|technologies)\b/i },
    { key: 'coreSkills', regex: /^(?:core\s+skills|core\s+competencies|technical\s+skills|skills\s*(?:&|and)\s*abilities)\b/i },
    { key: 'skills', regex: /^(?:skills|competencies)\b/i },
    { key: 'education', regex: /^(?:education|academic\s+background|qualifications|academic\s+history)\b/i },
    { key: 'certifications', regex: /^(?:certifications|certificates|licenses)\b/i },
    { key: 'awards', regex: /^(?:awards|honors|achievements)\b/i },
    { key: 'volunteer', regex: /^(?:volunteer|community|volunteering)\b/i },
    { key: 'publications', regex: /^(?:publications|papers|speaking)\b/i },
    { key: 'training', regex: /^(?:training|courses|workshops)\b/i },
    { key: 'spokenLanguages', regex: /^(?:languages|language\s+proficiency|spoken\s+languages)\b/i },
    { key: 'memberships', regex: /^(?:memberships|professional\s+affiliations|associations)\b/i },
    { key: 'references', regex: /^(?:references)\b/i }
  ];

  const sections = {};
  let currentKey = 'header';
  sections['header'] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line matches a known section header
    let matchedRule = null;
    if (line.length < 60) {
      matchedRule = SECTION_RULES.find(r => r.regex.test(line));
    }

    // Special check for 'languages' header:
    // If header says 'LANGUAGES' but the immediate next line contains 'JavaScript', 'Python', 'React',
    // then this is a 'techStack' or 'skills' section, NOT spoken languages!
    if (matchedRule && matchedRule.key === 'spokenLanguages') {
      const nextLine = lines[i + 1] || '';
      if (/javascript|python|java|c\+\+|php|sql|react|node|html/i.test(nextLine)) {
        matchedRule = { key: 'techStack' };
      }
    }

    if (matchedRule) {
      currentKey = matchedRule.key;
      if (!sections[currentKey]) sections[currentKey] = [];
    } else {
      if (!sections[currentKey]) sections[currentKey] = [];
      sections[currentKey].push(line);
    }
  }

  // 3. Extract Professional Summary
  let professionalSummary = '';
  if (sections.summary && sections.summary.length > 0) {
    professionalSummary = sections.summary.join(' ');
  } else if (sections.header && sections.header.length > 2) {
    const candidateSummaryLines = sections.header.slice(1, 5).filter(l => l.length > 30 && !l.includes('@'));
    if (candidateSummaryLines.length > 0) {
      professionalSummary = candidateSummaryLines.join(' ');
    }
  }

  // 4. Extract Career Objective
  let careerObjective = '';
  if (sections.objective && sections.objective.length > 0) {
    careerObjective = sections.objective.join(' ');
  }

  // 5. Extract Tech Stack & Core Skills
  const rawTechLines = [
    ...(sections.techStack || []),
    ...(sections.coreSkills || []),
    ...(sections.skills || [])
  ];

  const coreSkills = {
    frontendDevelopment: [],
    backendDevelopment: [],
    technicalSkills: [],
    softSkills: [],
    databases: [],
    toolsAndTechnologies: []
  };

  const techStack = {
    languages: [],
    frontend: [],
    backend: [],
    database: [],
    versionControl: [],
    other: []
  };

  const allDetectedTech = new Set();

  rawTechLines.forEach(l => {
    const isCategoryLine = /^(frontend|backend|database|database[s]?|tools|languages|version control|other)[\s:]+/i.test(l);
    if (isCategoryLine) {
      const parts = l.split(/[:–-]/);
      const category = parts[0].toLowerCase().trim();
      const items = (parts[1] || '').split(/[,|•*–—;]/).map(s => s.trim()).filter(Boolean);

      if (/frontend/i.test(category)) {
        items.forEach(it => { coreSkills.frontendDevelopment.push(it); techStack.frontend.push(it); allDetectedTech.add(it); });
      } else if (/backend/i.test(category)) {
        items.forEach(it => { coreSkills.backendDevelopment.push(it); techStack.backend.push(it); allDetectedTech.add(it); });
      } else if (/database/i.test(category)) {
        items.forEach(it => { coreSkills.databases.push(it); techStack.database.push(it); allDetectedTech.add(it); });
      } else if (/tool|version control/i.test(category)) {
        items.forEach(it => { coreSkills.toolsAndTechnologies.push(it); techStack.versionControl.push(it); allDetectedTech.add(it); });
      } else if (/language/i.test(category)) {
        items.forEach(it => {
          if (isTechnology(it)) {
            techStack.languages.push(it);
            allDetectedTech.add(it);
          }
        });
      }
    } else {
      // General skill token parsing
      const items = l.split(/[,|•*–—;]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
      items.forEach(it => {
        if (/communication|leadership|collaboration|teamwork|problem solving|mentoring|critical thinking|adaptability/i.test(it)) {
          if (!coreSkills.softSkills.includes(it)) coreSkills.softSkills.push(it);
        } else if (/react|vue|angular|html|css|tailwind|next\.js/i.test(it)) {
          if (!coreSkills.frontendDevelopment.includes(it)) coreSkills.frontendDevelopment.push(it);
          allDetectedTech.add(it);
        } else if (/node|express|django|flask|spring|fastapi/i.test(it)) {
          if (!coreSkills.backendDevelopment.includes(it)) coreSkills.backendDevelopment.push(it);
          allDetectedTech.add(it);
        } else if (/mongo|postgres|sql|redis|firebase/i.test(it)) {
          if (!coreSkills.databases.includes(it)) coreSkills.databases.push(it);
          allDetectedTech.add(it);
        } else if (/git|docker|kubernetes|postman|jira|figma|linux/i.test(it)) {
          if (!coreSkills.toolsAndTechnologies.includes(it)) coreSkills.toolsAndTechnologies.push(it);
          allDetectedTech.add(it);
        } else if (isTechnology(it)) {
          coreSkills.technicalSkills.push(it);
          allDetectedTech.add(it);
        }
      });
    }
  });

  // Comprehensive tech keywords check against full document
  const comprehensiveTechKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Next.js',
    'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'C#', '.NET', 'C++', 'Go', 'PHP',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase', 'Supabase',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'Linux',
    'REST APIs', 'GraphQL', 'Tailwind CSS', 'Bootstrap', 'HTML5', 'CSS3'
  ];

  comprehensiveTechKeywords.forEach(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|\\b|\\s)${escaped}(?:$|\\b|\\s)`, 'i').test(rawText)) {
      allDetectedTech.add(kw);
    }
  });

  const technicalSkillsArray = Array.from(allDetectedTech);

  // 6. Extract Project Experience (SavingsPlus Bank, AI Hire Platform, etc.)
  const projectExperience = [];
  const projectLines = sections.projects || [];
  let currentProject = null;

  for (let i = 0; i < projectLines.length; i++) {
    const line = projectLines[i];
    const isBullet = /^[-•*–—]\s*/.test(line);
    const cleanLine = line.replace(/^[-•*–—]\s*/, '').trim();

    // Check if line is a single-bullet project definition (e.g. "- CloudMesh Observability Hub: Description...")
    if (isBullet && cleanLine.includes(':') && cleanLine.length > 15) {
      if (currentProject) {
        projectExperience.push(currentProject);
        currentProject = null;
      }
      const parts = cleanLine.split(':');
      projectExperience.push({
        name: parts[0].trim(),
        role: 'Lead Contributor',
        description: parts.slice(1).join(':').trim(),
        technologies: [],
        url: '',
        achievements: []
      });
      continue;
    }

    // Check if line looks like a project title (e.g. "SavingsPlus Bank", "AI Hire Platform - Fullstack App")
    const isProjectTitle = !isBullet && line.length < 80 && (
      line.includes(' - ') || line.includes(' | ') || line.includes(':') ||
      /app|platform|bank|system|website|portal|clone|manager|service/i.test(line) ||
      (i + 1 < projectLines.length && /^[-•*–—]\s*/.test(projectLines[i + 1]))
    );

    if (isProjectTitle) {
      if (currentProject) projectExperience.push(currentProject);
      const titleParts = line.split(/[-–|:]/).map(s => s.trim()).filter(Boolean);
      currentProject = {
        name: titleParts[0] || line,
        role: titleParts[1] || 'Lead Developer',
        description: titleParts.slice(2).join(' ') || '',
        technologies: [],
        url: '',
        achievements: []
      };
    } else if (currentProject) {
      if (isBullet) {
        currentProject.achievements.push(cleanLine);
      } else if (!currentProject.description) {
        currentProject.description = cleanLine;
      } else {
        currentProject.achievements.push(cleanLine);
      }
    } else if (cleanLine.length > 5) {
      // First project without header
      currentProject = {
        name: cleanLine,
        role: 'Developer',
        description: '',
        technologies: [],
        url: '',
        achievements: []
      };
    }
  }
  if (currentProject) projectExperience.push(currentProject);

  // 7. Extract Work Experience (Chronological employment records)
  const workExperience = [];
  const expLines = sections.experience || [];
  let currentJob = null;

  const datePattern = /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\b(?:\d{4})\b\s*(?:[-–—to]+\s*(?:(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:\d{4}|present|current)\b)?)/i;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const isBullet = /^[-•*–—]\s*/.test(line);
    const hasDate = datePattern.test(line);

    if (isBullet) {
      if (currentJob) {
        const clean = line.replace(/^[-•*–—]\s*/, '').trim();
        if (/achieved|increased|reduced|improved|spearheaded|engineered|built/i.test(clean)) {
          currentJob.achievements.push(clean);
        } else {
          currentJob.responsibilities.push(clean);
        }
      }
    } else if (hasDate) {
      const dateMatch = line.match(datePattern);
      const dateStr = dateMatch ? dateMatch[0] : '';
      const parts = line.replace(datePattern, '').split(/[,|–—-]/).map(s => s.trim()).filter(Boolean);

      if (currentJob && currentJob.responsibilities.length === 0 && !currentJob.startDate) {
        currentJob.startDate = dateStr.split(/[-–—to]+/i)[0]?.trim() || '';
        currentJob.endDate = dateStr.split(/[-–—to]+/i)[1]?.trim() || 'Present';
        currentJob.current = /present|current/i.test(dateStr);
      } else {
        if (currentJob) workExperience.push(currentJob);
        currentJob = {
          company: parts[1] || parts[0] || 'Company',
          jobTitle: parts[0] || 'Software Engineer',
          location: parts[2] || '',
          startDate: dateStr.split(/[-–—to]+/i)[0]?.trim() || '',
          endDate: dateStr.split(/[-–—to]+/i)[1]?.trim() || 'Present',
          current: /present|current/i.test(dateStr),
          responsibilities: [],
          achievements: [],
          technologies: []
        };
      }
    } else if (currentJob) {
      currentJob.responsibilities.push(line);
    }
  }
  if (currentJob) workExperience.push(currentJob);

  // 8. Extract Education (Degrees, Diplomas, Institutions)
  const education = [];
  const eduLines = sections.education || [];
  let currentEdu = null;

  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i];
    const isEduDegree = /(?:bachelor|master|phd|b\.s|m\.s|b\.tech|diploma|degree|university|college|polytechnic|institute|sqi|futa)/i.test(line);

    if (isEduDegree) {
      if (currentEdu) education.push(currentEdu);
      const yearMatch = line.match(/\b(19\d\d|20\d\d)\b/g);
      const parts = line.split(/[,–—-]/).map(s => s.trim()).filter(Boolean);
      currentEdu = {
        institution: parts[0] || line,
        degree: parts[1] || 'Degree / Diploma',
        field: parts[2] || '',
        startDate: yearMatch && yearMatch.length > 1 ? yearMatch[0] : '',
        endDate: yearMatch && yearMatch.length > 0 ? yearMatch[yearMatch.length - 1] : ''
      };
    } else if (currentEdu) {
      if (!currentEdu.field) currentEdu.field = line;
      else if (!currentEdu.endDate && /\b(19\d\d|20\d\d)\b/.test(line)) {
        currentEdu.endDate = line.match(/\b(19\d\d|20\d\d)\b/)[0];
      }
    }
  }
  if (currentEdu) education.push(currentEdu);

  // 9. Extract Human Spoken Languages ONLY
  const rawSpokenLines = sections.spokenLanguages || [];
  const spokenLanguages = [];

  rawSpokenLines.forEach(l => {
    const items = l.split(/[,|•*–—;]/).map(s => s.trim()).filter(Boolean);
    items.forEach(it => {
      // Must NOT be a technology like React, Mongo, JS
      if (isSpokenLanguage(it) && !isTechnology(it)) {
        if (!spokenLanguages.includes(it)) spokenLanguages.push(it);
      }
    });
  });

  // Scan full text for English, Yoruba, and other common languages if not found in section
  if (spokenLanguages.length === 0) {
    if (/\byoruba\b/i.test(rawText) && !spokenLanguages.includes('Yoruba')) spokenLanguages.push('Yoruba');
    if (/\benglish\b/i.test(rawText) && !spokenLanguages.includes('English')) spokenLanguages.push('English');
    if (/\bspanish\b/i.test(rawText) && !spokenLanguages.includes('Spanish')) spokenLanguages.push('Spanish');
    if (/\bfrench\b/i.test(rawText) && !spokenLanguages.includes('French')) spokenLanguages.push('French');
  }
  if (spokenLanguages.length === 0) spokenLanguages.push('English');

  // 10. Certifications, Awards, Volunteer, Training, Memberships, References
  const certifications = (sections.certifications || []).map(c => c.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const awards = (sections.awards || []).map(a => a.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const volunteerExperience = (sections.volunteer || []).map(v => v.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const publications = (sections.publications || []).map(p => p.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const training = (sections.training || []).map(t => t.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const professionalMemberships = (sections.memberships || []).map(m => m.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const references = (sections.references || []).map(r => r.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

  // 11. Additional Uncategorized Sections
  const additionalSections = [];
  const knownKeys = [
    'header', 'summary', 'objective', 'experience', 'projects', 'techStack',
    'coreSkills', 'skills', 'education', 'certifications', 'awards', 'volunteer',
    'publications', 'training', 'spokenLanguages', 'memberships', 'references'
  ];
  Object.keys(sections).forEach(k => {
    if (!knownKeys.includes(k) && sections[k].length > 0) {
      additionalSections.push({
        sectionTitle: k.toUpperCase(),
        content: sections[k].join('\n')
      });
    }
  });

  return {
    personalInfo: {
      fullName,
      email,
      phone,
      location: 'Available upon request',
      linkedin,
      portfolio: github || linkedin || '',
      github
    },
    professionalTitle: professionalTitle || 'Fullstack Software Engineer',
    professionalSummary: professionalSummary || 'Results-driven software engineering professional with proven expertise across modern fullstack architectures, robust web systems, and scalable technical solutions.',
    careerObjective,
    targetRoles: [professionalTitle || 'Software Engineer'],
    skills: {
      technical: technicalSkillsArray.length > 0 ? technicalSkillsArray : ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'],
      soft: coreSkills.softSkills.length > 0 ? coreSkills.softSkills : ['Cross-functional Collaboration', 'Problem Solving', 'Effective Communication'],
      tools: coreSkills.toolsAndTechnologies.length > 0 ? coreSkills.toolsAndTechnologies : ['Git', 'VS Code', 'Postman'],
      languages: [] // strictly empty here to avoid confusion
    },
    coreSkills,
    techStack,
    workExperience,
    projectExperience,
    projects: projectExperience,
    education,
    certifications,
    awards,
    achievements: awards,
    volunteerExperience,
    publications,
    training,
    courses: [],
    languages: spokenLanguages,
    professionalMemberships,
    references,
    additionalSections,
    additionalInformation: []
  };
};

/**
 * Universal CV Parser with Gemini Structuring & Deterministic Validation Fallback
 */
const parseCvWithAI = async (rawText, documentStructure = null) => {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('CV text content is empty and cannot be parsed.');
  }

  const charCount = rawText.length;
  const wordCount = rawText.split(/\s+/).length;
  console.log(`[CV Parser] Ingesting document: ${charCount} chars, ~${wordCount} words`);

  let parsedResult = null;

  // Try Gemini AI structured understanding first
  try {
    const layoutContext = documentStructure && documentStructure.pages
      ? `\n\nDOCUMENT LAYOUT CONTEXT (Pages: ${documentStructure.pages.length}, Multi-column: ${documentStructure.isMultiColumn}):\n${JSON.stringify(documentStructure.pages.map(p => ({ page: p.pageNumber, isTwoColumn: p.isTwoColumn, linesCount: p.lines.length })))}`
      : '';

    const messages = [
      { role: 'system', content: CV_PARSER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract the entire supplied CV text into the exact JSON schema. NEVER summarize or discard any information. Strictly classify human spoken languages under "languages" and programming languages under "techStack" / "skills.technical":\n\n${rawText.slice(0, 45000)}${layoutContext}`
      }
    ];

    const aiResult = await requestJsonCompletion(messages, {
      temperature: 0.05,
      max_tokens: 8192
    });

    if (aiResult && aiResult.personalInfo && (aiResult.workExperience || aiResult.skills || aiResult.projectExperience)) {
      parsedResult = normalizeParsedCv(aiResult);
      console.log('[CV Parser] Gemini structured extraction succeeded.');
    }
  } catch (err) {
    console.warn('[CV Parser] Gemini extraction unavailable or encountered error:', err.message);
  }

  // If Gemini was unavailable, rate-limited, or returned empty, use deterministic parser
  if (!parsedResult) {
    console.log('[CV Parser] Activating Universal Deterministic Master CV Extractor...');
    parsedResult = fallbackParseCv(rawText);
  }

  // Always run through the Validation & Cross-Contamination Engine (Part 32, 33, 34)
  const validation = sanitizeAndValidateMasterCv(parsedResult, rawText);
  const validatedCv = validation.sanitizedMasterCv;
  validatedCv._completenessValidation = {
    isValid: validation.isValid,
    issues: validation.issues,
    remediationLog: validation.remediationLog,
    stats: validation.stats
  };

  if (validation.remediationLog.length > 0) {
    console.log('[CV Parser] Auto-remediation applied:', validation.remediationLog);
  }
  console.log('[CV Parser] Parsing complete. Stats:', validation.stats);

  return validatedCv;
};

/**
 * Normalizes Gemini output to match Master CV schema
 */
const normalizeParsedCv = (data) => {
  return {
    personalInfo: {
      fullName: data.personalInfo?.fullName || '',
      email: data.personalInfo?.email || '',
      phone: data.personalInfo?.phone || '',
      location: data.personalInfo?.location || '',
      linkedin: data.personalInfo?.linkedin || '',
      portfolio: data.personalInfo?.portfolio || '',
      github: data.personalInfo?.github || ''
    },
    professionalTitle: data.professionalTitle || '',
    professionalSummary: data.professionalSummary || '',
    careerObjective: data.careerObjective || '',
    targetRoles: Array.isArray(data.targetRoles) ? data.targetRoles : [],
    skills: {
      technical: Array.isArray(data.skills?.technical) ? data.skills.technical : [],
      soft: Array.isArray(data.skills?.soft) ? data.skills.soft : [],
      tools: Array.isArray(data.skills?.tools) ? data.skills.tools : [],
      languages: []
    },
    coreSkills: {
      frontendDevelopment: Array.isArray(data.coreSkills?.frontendDevelopment) ? data.coreSkills.frontendDevelopment : [],
      backendDevelopment: Array.isArray(data.coreSkills?.backendDevelopment) ? data.coreSkills.backendDevelopment : [],
      technicalSkills: Array.isArray(data.coreSkills?.technicalSkills) ? data.coreSkills.technicalSkills : [],
      softSkills: Array.isArray(data.coreSkills?.softSkills) ? data.coreSkills.softSkills : [],
      databases: Array.isArray(data.coreSkills?.databases) ? data.coreSkills.databases : [],
      toolsAndTechnologies: Array.isArray(data.coreSkills?.toolsAndTechnologies) ? data.coreSkills.toolsAndTechnologies : []
    },
    techStack: {
      languages: Array.isArray(data.techStack?.languages) ? data.techStack.languages : [],
      frontend: Array.isArray(data.techStack?.frontend) ? data.techStack.frontend : [],
      backend: Array.isArray(data.techStack?.backend) ? data.techStack.backend : [],
      database: Array.isArray(data.techStack?.database) ? data.techStack.database : [],
      versionControl: Array.isArray(data.techStack?.versionControl) ? data.techStack.versionControl : [],
      other: Array.isArray(data.techStack?.other) ? data.techStack.other : []
    },
    workExperience: Array.isArray(data.workExperience) ? data.workExperience.map(w => ({
      company: w.company || '',
      jobTitle: w.jobTitle || '',
      location: w.location || '',
      startDate: w.startDate || '',
      endDate: w.endDate || '',
      current: Boolean(w.current),
      responsibilities: Array.isArray(w.responsibilities) ? w.responsibilities : [],
      achievements: Array.isArray(w.achievements) ? w.achievements : [],
      technologies: Array.isArray(w.technologies) ? w.technologies : []
    })) : [],
    projectExperience: Array.isArray(data.projectExperience || data.projects) ? (data.projectExperience || data.projects).map(p => ({
      name: p.name || '',
      role: p.role || 'Contributor',
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
      url: p.url || '',
      achievements: Array.isArray(p.achievements) ? p.achievements : []
    })) : [],
    projects: Array.isArray(data.projects || data.projectExperience) ? (data.projects || data.projectExperience).map(p => ({
      name: p.name || '',
      role: p.role || 'Contributor',
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
      url: p.url || '',
      achievements: Array.isArray(p.achievements) ? p.achievements : []
    })) : [],
    education: Array.isArray(data.education) ? data.education.map(e => ({
      institution: e.institution || '',
      degree: e.degree || '',
      field: e.field || '',
      startDate: e.startDate || '',
      endDate: e.endDate || ''
    })) : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
    awards: Array.isArray(data.awards) ? data.awards : [],
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
    volunteerExperience: Array.isArray(data.volunteerExperience) ? data.volunteerExperience : [],
    publications: Array.isArray(data.publications) ? data.publications : [],
    training: Array.isArray(data.training) ? data.training : [],
    courses: Array.isArray(data.courses) ? data.courses : [],
    languages: Array.isArray(data.languages) ? data.languages : [],
    professionalMemberships: Array.isArray(data.professionalMemberships) ? data.professionalMemberships : [],
    references: Array.isArray(data.references) ? data.references : [],
    additionalSections: Array.isArray(data.additionalSections) ? data.additionalSections : [],
    additionalInformation: []
  };
};

module.exports = {
  parseCvWithAI,
  fallbackParseCv,
  normalizeParsedCv
};
