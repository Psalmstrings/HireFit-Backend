const { requestJsonCompletion } = require('../src/services/ai/geminiClient');
const { parseCvWithAI } = require('../src/services/ai/cvParserService');

const sampleCv = `
John Smith
john.smith@email.com | +1 555 123 4567
LinkedIn: linkedin.com/in/johnsmith | GitHub: github.com/johnsmith

PROFESSIONAL SUMMARY
Experienced full-stack developer with 6+ years building scalable web applications using React, Node.js and PostgreSQL. Led cross-functional teams of 8+ engineers delivering enterprise SaaS platforms.

WORK EXPERIENCE

Senior Software Engineer | TechCorp Inc | Jan 2021 - Present
- Designed and built microservices architecture handling 2M+ daily API requests
- Led migration from monolith to containerized Kubernetes deployment reducing costs by 40%
- Mentored team of 5 junior engineers through weekly code reviews

Software Engineer | StartupXYZ | Mar 2018 - Dec 2020
- Built React dashboard used by 15,000+ monthly active users
- Integrated 3rd-party payment APIs (Stripe, PayPal) processing USD 2M monthly

EDUCATION
BSc Computer Science | University of Technology | 2014 - 2018

SKILLS
Technical: React, Node.js, PostgreSQL, Docker, Kubernetes, AWS, Redis, GraphQL
Soft: Team Leadership, Problem Solving, Communication

CERTIFICATIONS
AWS Certified Solutions Architect - Associate (2022)
Google Cloud Professional Developer (2023)
`;

async function test() {
  console.log('--- Test 1: Gemini client without API key ---');
  const result = await requestJsonCompletion([
    { role: 'system', content: 'You are a test assistant.' },
    { role: 'user', content: 'Return JSON: {"status": "ok"}' }
  ]);
  console.log('No-key result (expected null):', result);
  console.log(result === null ? 'PASS: null returned, fallback will activate' : 'FAIL: expected null');

  console.log('\n--- Test 2: parseCvWithAI fallback ---');
  const parsed = await parseCvWithAI(sampleCv);
  console.log('Name:', parsed.personalInfo && parsed.personalInfo.fullName);
  console.log('Email:', parsed.personalInfo && parsed.personalInfo.email);
  console.log('Summary length:', parsed.professionalSummary ? parsed.professionalSummary.length + ' chars' : '0');
  console.log('Work experience jobs:', parsed.workExperience ? parsed.workExperience.length : 0);
  console.log('Education entries:', parsed.education ? parsed.education.length : 0);
  console.log('Technical skills:', parsed.skills && parsed.skills.technical ? parsed.skills.technical.length : 0);
  console.log('Certifications:', parsed.certifications ? parsed.certifications.length : 0);
  const v = parsed._completenessValidation;
  console.log('Validation:', v && v.isValid ? 'PASSED' : ('ISSUES: ' + (v ? v.issues.join(', ') : 'none')));

  console.log('\n--- Test 3: Chunked extraction (large CV simulation) ---');
  const largeCv = sampleCv.repeat(4);
  console.log('Large CV size:', largeCv.length, 'chars (should use chunks)');
  const largeParsed = await parseCvWithAI(largeCv);
  console.log('Large CV jobs extracted:', largeParsed.workExperience ? largeParsed.workExperience.length : 0);

  console.log('\n=== ALL TESTS COMPLETE ===');
}

test().catch(err => { console.error('Test error:', err.message); process.exit(1); });
