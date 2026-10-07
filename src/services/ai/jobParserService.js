const { requestJsonCompletion } = require('./aiClient');

const JOB_PARSER_SYSTEM_PROMPT = `
You are an expert AI Job Description Parser and Talent Acquisition Analyst.
Your task is to analyze job postings and convert them into a structured JSON schema.

STRICT INSTRUCTIONS:
1. Extract the primary job title, company name (if mentioned), and work model (Remote, Hybrid, On-site, or Not specified).
2. Clearly distinguish between "requiredSkills" (must-have prerequisites) and "preferredSkills" (nice-to-haves/plus).
3. Identify core responsibilities, key domain keywords, years of experience required, and educational requirements.
4. Output STRICTLY as a JSON object matching this schema:

{
  "jobTitle": "Job Title",
  "company": "Company Name or Company",
  "location": "Location or Remote",
  "seniority": "Entry-Level | Mid-Level | Senior | Lead | Director | Not specified",
  "industry": "Industry sector e.g. Fintech, SaaS, Healthcare",
  "remoteType": "Remote | Hybrid | On-site | Not specified",
  "requiredSkills": ["Skill 1", "Skill 2"],
  "preferredSkills": ["Skill 3", "Skill 4"],
  "responsibilities": ["Responsibility 1", "Responsibility 2"],
  "qualifications": ["Qualification 1", "Qualification 2"],
  "keywords": ["Domain Keyword 1", "Keyword 2"],
  "experienceRequirements": ["5+ years of experience in...", "Demonstrated experience with..."],
  "educationRequirements": ["Bachelor's in Computer Science or equivalent practical experience"],
  "certifications": ["AWS Certified or similar"],
  "tools": ["Jira", "Figma", "Docker"],
  "softSkills": ["Cross-functional collaboration", "Problem solving"]
}
`;

/**
 * Fallback parser when GEMINI_API_KEY is not configured or AI is unavailable
 */
const fallbackParseJob = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0] || 'Software Engineer';

  // Common keywords scanner
  const skillBank = [
    'React', 'JavaScript', 'TypeScript', 'Node.js', 'Express', 'Python', 'Django',
    'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'REST APIs', 'GraphQL',
    'Git', 'CI/CD', 'Unit Testing', 'System Design', 'Agile', 'Scrum', 'HTML5', 'CSS3'
  ];
  const detectedSkills = skillBank.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(rawText));

  const seniority = /senior|sr\./i.test(rawText)
    ? 'Senior'
    : /lead|principal/i.test(rawText)
    ? 'Lead'
    : /junior|entry/i.test(rawText)
    ? 'Entry-Level'
    : 'Mid-Level';

  const remoteType = /remote/i.test(rawText)
    ? 'Remote'
    : /hybrid/i.test(rawText)
    ? 'Hybrid'
    : /on-site|onsite/i.test(rawText)
    ? 'On-site'
    : 'Not specified';

  return {
    jobTitle: firstLine.length < 60 ? firstLine : 'Software Developer',
    company: 'Target Employer',
    location: remoteType === 'Remote' ? 'Remote' : 'Location specified in posting',
    seniority,
    industry: 'Technology & Software',
    remoteType,
    requiredSkills: detectedSkills.slice(0, 5).length > 0 ? detectedSkills.slice(0, 5) : ['JavaScript', 'React', 'REST APIs'],
    preferredSkills: detectedSkills.slice(5, 8).length > 0 ? detectedSkills.slice(5, 8) : ['Docker', 'AWS'],
    responsibilities: [
      'Design, build, and maintain efficient, reusable, and reliable code.',
      'Collaborate with cross-functional teams to define, design, and ship new features.',
      'Participate in code reviews, architectural discussions, and technical mentoring.'
    ],
    qualifications: [
      'Demonstrated experience in software development lifecycle.',
      'Strong problem-solving and communication skills.'
    ],
    keywords: detectedSkills.concat(['Scalability', 'Clean Code', 'Performance']),
    experienceRequirements: ['Relevant software engineering experience'],
    educationRequirements: ["Bachelor's degree in Computer Science, STEM field, or equivalent experience"],
    certifications: [],
    tools: ['Git', 'Docker'],
    softSkills: ['Collaboration', 'Communication', 'Adaptability']
  };
};

/**
 * Parses raw job description into structured JSON
 * @param {string} rawText 
 * @returns {Promise<object>}
 */
const parseJobWithAI = async (rawText) => {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Job description text is empty.');
  }

  const trimmedText = rawText.slice(0, 15000);

  const messages = [
    { role: 'system', content: JOB_PARSER_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Please parse this job description into the structured JSON schema:\n\n${trimmedText}`
    }
  ];

  const aiResult = await requestJsonCompletion(messages, { temperature: 0.1 });

  if (aiResult && (aiResult.jobTitle || aiResult.requiredSkills)) {
    return normalizeJobData(aiResult);
  }

  console.log('Using rule-based job parser fallback.');
  return fallbackParseJob(rawText);
};

const normalizeJobData = (data) => {
  return {
    jobTitle: data.jobTitle || 'Software Engineer',
    company: data.company || 'Hiring Company',
    location: data.location || 'Location specified in posting',
    seniority: data.seniority || 'Not specified',
    industry: data.industry || 'Technology',
    remoteType: ['Remote', 'Hybrid', 'On-site', 'Not specified'].includes(data.remoteType)
      ? data.remoteType
      : 'Not specified',
    requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
    preferredSkills: Array.isArray(data.preferredSkills) ? data.preferredSkills : [],
    responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
    qualifications: Array.isArray(data.qualifications) ? data.qualifications : [],
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    experienceRequirements: Array.isArray(data.experienceRequirements) ? data.experienceRequirements : [],
    educationRequirements: Array.isArray(data.educationRequirements) ? data.educationRequirements : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
    tools: Array.isArray(data.tools) ? data.tools : [],
    softSkills: Array.isArray(data.softSkills) ? data.softSkills : []
  };
};

module.exports = { parseJobWithAI, fallbackParseJob };
