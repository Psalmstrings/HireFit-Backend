const { requestJsonCompletion } = require('./aiClient');

const INTERVIEW_PREP_PROMPT = `
You are a senior technical interviewer and executive hiring manager.
Your task is to generate high-yield, realistic interview questions for a candidate based directly on their CV and the target job description.

REQUIREMENTS:
1. Provide a balanced set of 6-8 questions across:
   - Technical
   - Behavioral
   - Role-Specific
   - CV-Specific (asking about specific projects or metrics mentioned in their resume)
2. FOR EACH QUESTION PROVIDE:
   - whyTheyAsk: The underlying capability or signal the interviewer is testing.
   - answerStructure: A structured strategy to answer (e.g., STAR framework or system architecture walk-through).
   - candidateTalkingPoints: Concrete points and real achievements from the candidate's CV that they can legitimately reference. DO NOT invent false stories.

OUTPUT SCHEMA:
{
  "questions": [
    {
      "category": "Technical | Behavioral | Role-Specific | CV-Specific",
      "question": "Question text",
      "whyTheyAsk": "Explanation of interviewer intent",
      "answerStructure": "Step-by-step answering blueprint",
      "candidateTalkingPoints": ["Point 1 from candidate CV", "Point 2"]
    }
  ]
}
`;

const fallbackInterviewQuestions = (parsedCv, parsedJob) => {
  const topTech = (parsedCv.skills?.technical || ['web architectures'])[0] || 'core technologies';
  const role = parsedJob.jobTitle || 'Software Engineer';
  const recentCompany = parsedCv.workExperience?.[0]?.company || 'your previous company';

  return {
    questions: [
      {
        category: 'CV-Specific',
        question: `In your CV, you mention your tenure at ${recentCompany}. Can you walk me through your most impactful technical contribution there?`,
        whyTheyAsk: 'To assess depth of ownership, problem-solving under real constraints, and authenticity of your resume achievements.',
        answerStructure: 'Context (15%) -> Problem (25%) -> Action taken (45%) -> Measurable Outcome (15%).',
        candidateTalkingPoints: [
          `Highlight the specific responsibilities listed in your experience at ${recentCompany}.`,
          'Focus on trade-offs made during implementation and teamwork with colleagues.'
        ]
      },
      {
        category: 'Technical',
        question: `How have you used ${topTech} in production systems, and what performance considerations did you keep in mind?`,
        whyTheyAsk: `To test practical engineering competence in ${topTech} beyond surface-level syntax.`,
        answerStructure: 'Explain architecture -> Discuss bottleneck identified -> Detail optimization implemented -> State latency or memory improvement.',
        candidateTalkingPoints: [
          `Reference project implementations from your CV where ${topTech} was applied.`,
          'Mention state management, caching, or data fetching patterns used.'
        ]
      },
      {
        category: 'Role-Specific',
        question: `What attracts you to this ${role} role, and how does your previous background prepare you to hit the ground running?`,
        whyTheyAsk: 'To evaluate candidate motivation, alignment with job requirements, and self-awareness.',
        answerStructure: 'Company alignment -> Direct parallel between job responsibilities and past work -> Long-term value contribution.',
        candidateTalkingPoints: [
          `Connect your target role interests with the responsibilities in the job posting.`,
          'Mention your ability to ramp up quickly on modern development workflows.'
        ]
      },
      {
        category: 'Behavioral',
        question: 'Tell me about a time you encountered a tight deadline or conflicting requirements from stakeholders.',
        whyTheyAsk: 'To gauge emotional intelligence, prioritization, and communication under pressure.',
        answerStructure: 'Situation -> Task -> Action (prioritization & communication) -> Result.',
        candidateTalkingPoints: [
          'Pick a genuine challenging project from your career timeline.',
          'Emphasize transparent stakeholder communication and phased feature delivery.'
        ]
      },
      {
        category: 'Technical',
        question: 'How do you approach testing, code reviews, and ensuring code quality in a fast-paced development cycle?',
        whyTheyAsk: 'To ensure you adhere to engineering best practices and can maintain sustainable velocity.',
        answerStructure: 'Unit/integration testing strategy -> Pull request review ethos -> CI/CD pipeline automation.',
        candidateTalkingPoints: [
          'Discuss automated testing practices and collaborative PR reviews from your experience.',
          'Highlight your focus on maintainable, self-documenting code.'
        ]
      }
    ]
  };
};

const generateInterviewQuestionsWithAI = async (parsedCv, parsedJob) => {
  const messages = [
    { role: 'system', content: INTERVIEW_PREP_PROMPT },
    {
      role: 'user',
      content: `Generate tailored interview questions for:\n\nCANDIDATE CV:\n${JSON.stringify({ name: parsedCv.personalInfo?.fullName, summary: parsedCv.professionalSummary, workExperience: parsedCv.workExperience, skills: parsedCv.skills }, null, 2)}\n\nJOB REQUIREMENTS:\n${JSON.stringify({ title: parsedJob.jobTitle, company: parsedJob.company, required: parsedJob.requiredSkills, responsibilities: parsedJob.responsibilities }, null, 2)}`
    }
  ];

  const aiResult = await requestJsonCompletion(messages, { temperature: 0.3 });

  if (aiResult && Array.isArray(aiResult.questions) && aiResult.questions.length > 0) {
    return aiResult;
  }

  return fallbackInterviewQuestions(parsedCv, parsedJob);
};

module.exports = { generateInterviewQuestionsWithAI, fallbackInterviewQuestions };
