const { requestJsonCompletion } = require('./aiClient');

const SKILLS_GAP_PROMPT = `
You are an expert talent development and skill mapping advisor.
Analyze the candidate's CV against the target job requirements.
Categorize the skills into three distinct tiers:

1. STRONG: Core requirements where the candidate has explicitly demonstrated hands-on experience and achievements in their CV.
2. DEVELOP: Areas where the candidate has related or adjacent knowledge, but could sharpen depth or provide clearer evidence.
3. NOT EVIDENCED: Requirements from the job description that were NOT identified in the CV.
   CRITICAL NOTE: Use phrasing like: "Not identified in your supplied CV. If you have worked with this, add it to your experience." NEVER state: "You don't know this."

OUTPUT FORMAT:
{
  "strong": [
    {
      "skill": "Skill name",
      "evidence": "How it is demonstrated in the CV",
      "relevance": "Why it matters for this job"
    }
  ],
  "develop": [
    {
      "skill": "Skill name",
      "currentEvidence": "Related experience found",
      "recommendation": "How to strengthen evidence or articulate transferrable knowledge"
    }
  ],
  "notEvidenced": [
    {
      "skill": "Skill name",
      "importance": "High | Medium | Low",
      "note": "Experience with [Skill] was not identified in your supplied CV."
    }
  ],
  "summary": "High-level summary of candidate skill fit and top areas to highlight."
}
`;

const fallbackSkillsGap = (parsedCv, parsedJob) => {
  const cvTech = (parsedCv.skills?.technical || []).concat(parsedCv.skills?.tools || []);
  const reqSkills = parsedJob.requiredSkills || ['React', 'JavaScript', 'REST APIs'];
  const prefSkills = parsedJob.preferredSkills || ['Docker', 'AWS'];

  const strong = [];
  const develop = [];
  const notEvidenced = [];

  reqSkills.forEach(req => {
    const found = cvTech.some(t => t.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(t.toLowerCase()));
    if (found) {
      strong.push({
        skill: req,
        evidence: `Directly evidenced in candidate technical skills and work history.`,
        relevance: `Required competency for ${parsedJob.jobTitle || 'the role'}.`
      });
    } else {
      notEvidenced.push({
        skill: req,
        importance: 'High',
        note: `${req} was not identified in your supplied CV. If you have practical experience with it, make sure to add it.`
      });
    }
  });

  prefSkills.forEach(pref => {
    develop.push({
      skill: pref,
      currentEvidence: `General engineering background documented in CV.`,
      recommendation: `Clarify any personal projects, coursework, or adjacent tools used that involve ${pref}.`
    });
  });

  return {
    strong,
    develop,
    notEvidenced,
    summary: `Your CV exhibits strong capability in ${strong.map(s => s.skill).join(', ') || 'core engineering competencies'}. Closing the evidence gap on ${notEvidenced.map(n => n.skill).join(', ') || 'additional requirements'} will optimize your application.`
  };
};

const analyzeSkillsGap = async (parsedCv, parsedJob) => {
  const messages = [
    { role: 'system', content: SKILLS_GAP_PROMPT },
    {
      role: 'user',
      content: `Analyze skills gap between:\n\nCV DATA:\n${JSON.stringify(parsedCv.skills, null, 2)}\n\nJOB REQUIREMENTS:\n${JSON.stringify({ required: parsedJob.requiredSkills, preferred: parsedJob.preferredSkills }, null, 2)}`
    }
  ];

  const aiResult = await requestJsonCompletion(messages, { temperature: 0.1 });

  if (aiResult && Array.isArray(aiResult.strong)) {
    return aiResult;
  }

  return fallbackSkillsGap(parsedCv, parsedJob);
};

module.exports = { analyzeSkillsGap, fallbackSkillsGap };
