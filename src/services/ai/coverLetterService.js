const { requestJsonCompletion } = require('./aiClient');

const COVER_LETTER_PROMPT = `
You are an executive career advisor and professional resume writer.
Your task is to craft a compelling, tailored cover letter for a specific job posting based EXCLUSIVELY on genuine facts, skills, and achievements present in the candidate's CV.

STRICT RULES:
1. NEVER invent employers, accomplishments, metrics, or technologies not present in the CV.
2. Structure the letter professionally:
   - Strong opening expressing enthusiasm for the exact role and company
   - 2 focused body paragraphs connecting candidate's genuine achievements to the role's needs
   - Professional closing with a clear call to conversation
3. Tone should match requested tone (professional, enthusiastic, confident, or direct).

OUTPUT FORMAT:
{
  "content": "Full formatted cover letter text with paragraphs separated by double newlines.",
  "keyHighlights": ["Highlight 1", "Highlight 2"]
}
`;

const fallbackCoverLetter = (parsedCv, parsedJob, tone = 'professional') => {
  const candidateName = parsedCv.personalInfo?.fullName || 'Candidate';
  const role = parsedJob.jobTitle || 'Software Engineer';
  const company = parsedJob.company || 'Hiring Team';
  const topSkills = (parsedCv.skills?.technical || ['software development', 'collaborative engineering']).slice(0, 3).join(', ');
  const recentCompany = parsedCv.workExperience?.[0]?.company || 'prior engineering engagements';

  const content = `Dear Hiring Manager at ${company},

I am writing to express my enthusiastic interest in the ${role} position. Having reviewed your job requirements, I believe my hands-on background in ${topSkills} and track record of delivering resilient software solutions make me a strong candidate for this role.

During my time at ${recentCompany}, I focused on engineering scalable, reliable applications and collaborating across cross-functional teams to translate complex requirements into clean code. My experience aligns closely with your team's goals, particularly around building high-quality, maintainable systems that drive measurable business impact.

I am particularly excited about the opportunity at ${company} because of your team's focus on innovation and engineering excellence. I welcome the opportunity to discuss how my verified background and technical capabilities can contribute directly to your objectives.

Thank you for your time and consideration.

Sincerely,
${candidateName}`;

  return {
    content,
    keyHighlights: [
      `Demonstrated capability in ${topSkills}`,
      `Proven experience delivered at ${recentCompany}`
    ]
  };
};

const generateCoverLetterWithAI = async (parsedCv, parsedJob, tone = 'professional') => {
  const messages = [
    { role: 'system', content: COVER_LETTER_PROMPT },
    {
      role: 'user',
      content: `Create a ${tone} cover letter based on:\n\nCANDIDATE CV:\n${JSON.stringify({ name: parsedCv.personalInfo?.fullName, summary: parsedCv.professionalSummary, experience: parsedCv.workExperience, skills: parsedCv.skills }, null, 2)}\n\nTARGET ROLE:\nJob Title: ${parsedJob.jobTitle}\nCompany: ${parsedJob.company}\nKey Responsibilities: ${JSON.stringify(parsedJob.responsibilities || [])}`
    }
  ];

  const aiResult = await requestJsonCompletion(messages, { temperature: 0.3 });

  if (aiResult && aiResult.content) {
    return aiResult;
  }

  return fallbackCoverLetter(parsedCv, parsedJob, tone);
};

module.exports = { generateCoverLetterWithAI, fallbackCoverLetter };
