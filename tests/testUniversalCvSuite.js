require('dotenv').config();
const { parseCvWithAI, fallbackParseCv } = require('../src/services/ai/cvParserService');
const { optimizeCvWithAI } = require('../src/services/ai/cvOptimizationService');
const { sanitizeAndValidateMasterCv } = require('../src/services/ai/validationService');
const { extractDocumentContent } = require('../src/services/document/documentExtractionService');

// ─── REGRESSION TEST: Samuel's Fullstack Resume (Part 48) ────────────────────
const samuelResumeText = `
Samuel Adebayo
Fullstack Developer
samuel.adebayo@example.com | +234 801 234 5678 | Lagos, Nigeria
LinkedIn: linkedin.com/in/samueladebayo | GitHub: github.com/samueladebayo

PROFESSIONAL SUMMARY
Passionate and results-driven Fullstack Developer with strong hands-on experience in building scalable web applications using modern JavaScript ecosystems. Proficient in designing responsive user interfaces with React and developing high-performance RESTful APIs with Node.js and Express. Dedicated to writing clean, maintainable code and solving complex technical challenges.

TECH STACK
Frontend: React.js, Next.js, Redux Toolkit, Tailwind CSS, HTML5, CSS3, JavaScript (ES6+), TypeScript
Backend: Node.js, Express.js, RESTful APIs, JWT Authentication
Databases: MongoDB, Mongoose, PostgreSQL
Tools & Version Control: Git, GitHub, VS Code, Postman, Vite, Vercel, Netlify

CORE SKILLS
Frontend Development: Component Architecture, State Management, Responsive Design, API Integration
Backend Development: Server Architecture, Middleware Implementation, Database Modeling
Soft Skills: Problem Solving, Team Collaboration, Agile Methodologies, Fast Learner
Databases: Schema Design, Query Optimization, CRUD Operations
Tools & Technologies: Git Workflow, REST API Design, CI/CD Basics

PROJECT EXPERIENCE

SavingsPlus Bank - Modern Fintech Banking Application
- Developed a comprehensive web banking platform featuring secure user authentication, fund transfers, transaction histories, and savings goals.
- Built interactive dashboard with React and Chart.js to visualize user spending patterns.
- Integrated JWT authentication and bcrypt password hashing ensuring enterprise-grade data security.
- Technologies: React, Node.js, Express, MongoDB, Tailwind CSS

AI Hire Platform - AI-Driven Recruitment & Assessment Portal
- Created an end-to-end applicant tracking and AI interview assessment web application.
- Implemented real-time candidate scorecard analytics and automated resume matching.
- Technologies: React, TypeScript, Node.js, MongoDB, REST APIs

Logistic Company Website - Cargo Tracking & Dispatch System
- Designed and built a responsive commercial web portal for global freight management.
- Features real-time package status tracking, quotation calculator, and booking inquiry system.
- Technologies: Next.js, React, Tailwind CSS, Node.js

Movie App - Streaming Discovery Platform
- Developed a dynamic film discovery portal utilizing third-party movie database APIs.
- Built search filtering, watchlist curation, and trailer video playback integration.
- Technologies: React, Redux, TMDB API, CSS3

Blog Application - Content Management System
- Architected a full-featured blogging platform with rich text editing, comments, and tagging.
- Technologies: React, Node.js, Express, MongoDB

EDUCATION
SQI College of ICT, Ibadan
Diploma in Software Engineering - 2025

Federal University of Technology, Akure (FUTA)
Bachelor of Technology - 2024

LANGUAGES
English (Fluent)
Yoruba (Native)
`;

async function runUniversalTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('        HIREFIT UNIVERSAL CV PARSER & MASTER CV TEST SUITE         ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      process.exitCode = 1;
    }
  }

  // ─── TEST 1: Mandatory Samuel's Resume Regression Test (Part 48) ────────────
  console.log('1. MANDATORY REGRESSION TEST: Samuel\'s Fullstack Resume');
  const parsedSamuel = await parseCvWithAI(samuelResumeText);

  assert(parsedSamuel.personalInfo.fullName.includes('Samuel'), 'Name preserved', parsedSamuel.personalInfo.fullName);
  assert(parsedSamuel.personalInfo.email.includes('samuel.adebayo'), 'Email preserved', parsedSamuel.personalInfo.email);
  assert(parsedSamuel.professionalSummary.length > 100, 'Professional Summary preserved without shortening');
  assert(parsedSamuel.professionalTitle.includes('Fullstack Developer') || parsedSamuel.targetRoles.some(r => r.includes('Developer')), 'Professional Title preserved');

  // CRITICAL CHECK: Languages must contain English and Yoruba, and MUST NOT contain React/Mongo/Projects!
  const samuelLanguages = parsedSamuel.languages.map(l => (typeof l === 'string' ? l : l.name || l.language).toLowerCase());
  const hasEnglish = samuelLanguages.some(l => l.includes('english'));
  const hasYoruba = samuelLanguages.some(l => l.includes('yoruba'));
  const hasNoTechInLanguages = !samuelLanguages.some(l => l.includes('react') || l.includes('mongo') || l.includes('node') || l.includes('savingsplus'));

  assert(hasEnglish, 'Languages contains English');
  assert(hasYoruba, 'Languages contains Yoruba');
  assert(hasNoTechInLanguages, 'Languages strictly contains NO tech stack or projects (Cross-Contamination Resolved)');

  // Projects check
  const samuelProjects = parsedSamuel.projectExperience || parsedSamuel.projects || [];
  assert(samuelProjects.length >= 5, `All 5 Projects preserved (Found: ${samuelProjects.length})`);
  const projectNames = samuelProjects.map(p => p.name.toLowerCase());
  assert(projectNames.some(n => n.includes('savingsplus')), 'SavingsPlus Bank project preserved');
  assert(projectNames.some(n => n.includes('ai hire')), 'AI Hire Platform project preserved');
  assert(projectNames.some(n => n.includes('logistic')), 'Logistic Company Website project preserved');
  assert(projectNames.some(n => n.includes('movie')), 'Movie App project preserved');
  assert(projectNames.some(n => n.includes('blog')), 'Blog Application project preserved');

  // Education check
  const samuelEdu = parsedSamuel.education || [];
  assert(samuelEdu.length >= 2, `All 2 Education entries preserved (Found: ${samuelEdu.length})`);
  const eduInstitutions = samuelEdu.map(e => e.institution.toLowerCase());
  assert(eduInstitutions.some(i => i.includes('sqi')), 'SQI College of ICT preserved');
  assert(eduInstitutions.some(i => i.includes('federal') || i.includes('futa')), 'Federal University of Technology, Akure preserved');

  // Tech stack check
  const hasTech = (parsedSamuel.skills?.technical?.length || 0) > 10 || (parsedSamuel.techStack?.frontend?.length || 0) > 0;
  assert(hasTech, 'Tech stack and technical competencies preserved');

  // ─── TEST 2: Cross-Contamination Guard Engine (Part 33) ───────────────────
  console.log('\n2. CROSS-CONTAMINATION ENGINE VALIDATION');
  const dirtyCv = {
    languages: ['English', 'React.js', 'MongoDB', 'Yoruba', 'Express.js', 'SavingsPlus Project'],
    skills: { technical: ['JavaScript', 'Spanish'] },
    workExperience: [],
    projects: []
  };
  const sanitized = sanitizeAndValidateMasterCv(dirtyCv, 'English Yoruba');
  const cleanLangs = sanitized.sanitizedMasterCv.languages.map(l => (typeof l === 'string' ? l : l.name).toLowerCase());
  assert(!cleanLangs.some(l => l.includes('react') || l.includes('mongo') || l.includes('savingsplus')), 'Filtered out tech and projects from languages');
  assert(cleanLangs.some(l => l.includes('english')), 'Kept English in languages');
  assert(cleanLangs.some(l => l.includes('yoruba')), 'Kept Yoruba in languages');
  assert(sanitized.sanitizedMasterCv.skills.technical.includes('React.js'), 'Moved React.js into technical skills');
  assert(sanitized.sanitizedMasterCv.skills.technical.includes('MongoDB'), 'Moved MongoDB into technical skills');

  // ─── TEST 3: Non-Destructive Job Optimization & Master Immutability ─────────
  console.log('\n3. MASTER CV IMMUTABILITY & NON-DESTRUCTIVE OPTIMIZATION');
  const sampleJob = {
    jobTitle: 'Senior Full Stack Engineer',
    company: 'Fintech Global Ltd',
    requiredSkills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
    preferredSkills: ['PostgreSQL', 'Tailwind CSS']
  };

  const masterSnapshotBefore = JSON.stringify(parsedSamuel);
  const optimizationResult = await optimizeCvWithAI(parsedSamuel, sampleJob, {});

  const masterSnapshotAfter = JSON.stringify(parsedSamuel);
  assert(masterSnapshotBefore === masterSnapshotAfter, 'Master CV remains 100% IMMUTABLE during optimization');

  const optCv = optimizationResult.optimizedCv;
  assert(optCv.workExperience.length === parsedSamuel.workExperience.length, 'Optimized CV preserved all work experience jobs');
  assert((optCv.projectExperience || optCv.projects).length >= 5, 'Optimized CV preserved all projects');
  assert(optCv.education.length >= 2, 'Optimized CV preserved all education degrees');
  assert(optCv.languages.length >= 2, 'Optimized CV preserved spoken languages');
  assert(optimizationResult.changes.length > 0, 'Optimizer generated clear before/after changes diffs');

  // ─── TEST 4: Universal CV Formats (Part 50) ───────────────────────────────
  console.log('\n4. UNIVERSAL CV PATTERNS (Part 50 Scenarios)');

  // Pattern A: Skills-first & Projects-only CV (No traditional employer)
  const skillsFirstCv = `
Jane Doe | jane@example.com | +1 555 987 6543
PROJECTS
E-Commerce API: Built high-throughput microservices using Node.js and Redis handling 50k rpm.
Portfolio Site: Designed modern animated landing page using React and Three.js.
TECHNICAL SKILLS
Python, Django, FastAPI, Docker, Kubernetes, AWS
LANGUAGES
French, English
EDUCATION
BSc Computer Science, 2022
`;
  const parsedSkillsFirst = await parseCvWithAI(skillsFirstCv);
  assert((parsedSkillsFirst.projectExperience || parsedSkillsFirst.projects).length >= 2, 'Skills-first CV: Projects extracted');
  assert(parsedSkillsFirst.skills.technical.length >= 4, 'Skills-first CV: Skills extracted');
  assert(parsedSkillsFirst.languages.length >= 2, 'Skills-first CV: Spoken languages preserved');

  // Pattern B: Education-first & Academic CV
  const academicCv = `
Dr. Alan Turing | alan@cambridge.edu
EDUCATION
PhD Mathematics, Cambridge University, 1938
BA Mathematics, King's College, 1934
PUBLICATIONS
On Computable Numbers, with an Application to the Entscheidungsproblem (1936)
Computing Machinery and Intelligence (1950)
RESEARCH EXPERIENCE
Senior Researcher | Government Code and Cypher School | 1939 - 1945
- Designed the Bombe electromechanical device decrypting Enigma communications.
`;
  const parsedAcademic = await parseCvWithAI(academicCv);
  assert(parsedAcademic.education.length >= 2, 'Academic CV: Both degrees extracted');
  assert(parsedAcademic.workExperience.length >= 1, 'Academic CV: Research experience extracted');

  // Pattern C: Custom Section Names & Unconventional Ordering
  const unconventionalCv = `
Elena Rostova | elena@example.com
REPRESENTATIVE ENGAGEMENTS
Fintech Overhaul: Led modernization of banking core system.
HONORS & CITATIONS
Innovator of the Year 2023 - Tech Council
COMMUNITY LEADERSHIP
Volunteer Lead at Code for Good
TECHNICAL COMPETENCIES
Go, Rust, PostgreSQL, Kafka
`;
  const parsedUnconventional = await parseCvWithAI(unconventionalCv);
  assert(parsedUnconventional.skills.technical.length >= 3, 'Unconventional CV: Technical competencies extracted');
  assert(
    parsedUnconventional.awards.length > 0 ||
    parsedUnconventional.additionalSections.length > 0,
    'Unconventional CV: Honors & Custom sections preserved without loss'
  );

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL PRODUCTION REGRESSION & UNIVERSAL INTEGRATION TESTS PASSED!');
  } else {
    throw new Error('Some tests failed.');
  }
}

runUniversalTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
