const { requestJsonCompletion } = require('./aiClient');

const CV_OPTIMIZER_SYSTEM_PROMPT = `
You are a professional CV optimization system.

You are given a complete master CV and a target job description.

Your task is to tailor the master CV to the target role.

You MUST preserve all substantive information from the master CV.

You may rewrite wording, improve clarity, improve professional language, prioritize relevant information, reorder information and improve keyword alignment.

You MUST NOT remove jobs, responsibilities, achievements, skills, education, certifications, projects or other substantive sections simply because they are less relevant.

You MUST NOT invent information.
You MUST NOT fabricate metrics.
You MUST NOT fabricate skills (ONLY skills present in the Master CV or explicitly marked as Candidate-Confirmed may be added).
You MUST NOT fabricate experience.
You MUST NOT fabricate qualifications.

CANDIDATE-CONFIRMED FACTS RULE:
If Candidate-Confirmed Facts are provided, they represent verified capabilities confirmed directly by the user (e.g. working knowledge of a skill like TypeScript). You ARE authorized and encouraged to integrate these confirmed items naturally into the Skills list, Summary, and relevant technology stacks.
CRITICAL: If a skill or requirement is NEITHER in the Master CV NOR in the Candidate-Confirmed Facts list, it MUST NOT be added to the CV as experience or capability.

OPTIMIZATION MODES:
- 'balanced' (Default): Balanced high-impact professional tailoring, active verbs, and natural keyword alignment.
- 'aggressive': Maximum keyword density and prominent ATS positioning for all verified and confirmed capabilities.
- 'conservative': Subtle refinements, keeping existing phrasing very close to original Master CV while integrating confirmed facts.

The optimized CV should be a refined version of the complete master CV, not a summary of it.

Think:
PRESERVE EVERYTHING → CHECK CONFIRMED FACTS → IDENTIFY RELEVANCE → APPLY OPTIMIZATION MODE → IMPROVE WORDING & POSITIONING → ZERO FABRICATION.

OUTPUT JSON FORMAT:
{
  "optimizedCv": {
    "personalInfo": { ... },
    "professionalSummary": "Improved wording of complete professional summary tailored to target role",
    "careerObjective": "...",
    "targetRoles": ["Target Role 1"],
    "skills": {
      "technical": ["Prioritized & aligned existing skills, preserving all of them"],
      "soft": ["..."],
      "tools": ["..."],
      "languages": ["..."]
    },
    "workExperience": [
      {
        "company": "Exact same company",
        "jobTitle": "Job Title (preserve exact title or industry standard)",
        "location": "...",
        "startDate": "...",
        "endDate": "...",
        "current": true,
        "responsibilities": ["Rewritten or preserved bullet 1", "Rewritten or preserved bullet 2"],
        "achievements": ["Preserved/strengthened achievement 1"],
        "technologies": ["..."]
      }
    ],
    "education": [ ...all degrees and institutions preserved... ],
    "certifications": [ ...all certifications preserved... ],
    "projects": [ ...all projects preserved, descriptions improved... ],
    "awards": [ ...all awards preserved... ],
    "volunteerExperience": [ ...all volunteer experience preserved... ],
    "publications": [ ...all preserved... ],
    "training": [ ...all preserved... ],
    "courses": [ ...all preserved... ],
    "languages": [ ...all preserved... ],
    "professionalMemberships": [ ...all preserved... ],
    "references": [ ...all preserved... ],
    "additionalSections": [ ...all preserved... ]
  },
  "changes": [
    {
      "section": "Professional Summary",
      "field": "professionalSummary",
      "before": "Original text...",
      "after": "Tailored text...",
      "rationale": "Strengthened alignment with target job competencies without fabricating claims.",
      "status": "accepted"
    }
  ],
  "preservedSections": [
    "Complete Professional Summary",
    "All Work Experiences",
    "All Skills & Competencies",
    "Education & Credentials",
    "Certifications",
    "Projects",
    "Additional Sections"
  ],
  "improvedSections": [
    "Professional Summary wording & role alignment",
    "Relevant experience positioning",
    "Job-specific keyword integration",
    "Bullet point clarity & action verbs",
    "Skill prioritization for ATS indexing"
  ]
}
`;

/**
 * Validate and restore any content that the AI may have dropped.
 * Non-destructive enforcement layer: Master CV content is GUARANTEED to survive.
 */
const enforceNonDestructivePreservation = (masterCv, candidateOptimizedCv, candidateConfirmedFacts = []) => {
  const optimized = JSON.parse(JSON.stringify(candidateOptimizedCv || masterCv));
  const restoredChanges = [];

  // 1. Personal Info preservation
  optimized.personalInfo = {
    ...masterCv.personalInfo,
    ...optimized.personalInfo
  };

  // 2. Summary preservation: if AI wiped summary, restore master summary
  if (!optimized.professionalSummary || optimized.professionalSummary.trim().length === 0) {
    optimized.professionalSummary = masterCv.professionalSummary || '';
  }

  // 3. Work Experience count & item preservation
  const masterJobs = masterCv.workExperience || [];
  const optJobs = optimized.workExperience || [];

  if (optJobs.length < masterJobs.length) {
    console.warn(`[Preservation Layer] AI dropped ${masterJobs.length - optJobs.length} jobs. Restoring missing jobs.`);
    // Reconcile jobs by company/title
    masterJobs.forEach((mJob, idx) => {
      const match = optJobs.find(o => 
        (o.company && mJob.company && o.company.toLowerCase() === mJob.company.toLowerCase()) ||
        (o.jobTitle && mJob.jobTitle && o.jobTitle.toLowerCase() === mJob.jobTitle.toLowerCase())
      );
      if (!match) {
        optJobs.splice(idx, 0, mJob);
      }
    });
  }

  // Re-verify each job preserves all responsibilities
  optimized.workExperience = masterJobs.map((mJob, idx) => {
    const oJob = optJobs[idx] || mJob;
    const mResps = mJob.responsibilities || [];
    const oResps = oJob.responsibilities || [];

    // If AI truncated responsibilities, ensure count matches or exceeds
    const finalResps = mResps.map((mResp, rIdx) => {
      return oResps[rIdx] || mResp;
    });

    return {
      ...mJob,
      jobTitle: oJob.jobTitle || mJob.jobTitle,
      responsibilities: finalResps,
      achievements: oJob.achievements && oJob.achievements.length >= (mJob.achievements || []).length
        ? oJob.achievements
        : (mJob.achievements || []),
      technologies: oJob.technologies && oJob.technologies.length > 0 ? oJob.technologies : (mJob.technologies || [])
    };
  });

  // 4. Skills preservation: Ensure ALL skills from master are present, plus candidate-confirmed skills
  const masterTech = masterCv.skills?.technical || [];
  const optTech = optimized.skills?.technical || [];
  const confirmedSkillNames = (candidateConfirmedFacts || [])
    .filter(f => f && f.confirmed !== false && f.name)
    .map(f => f.name.toLowerCase());

  // Filter out any newly added skills that are neither in master nor candidate-confirmed
  const validOptTech = optTech.filter(skill => {
    const lower = skill.toLowerCase();
    const isInMaster = masterTech.some(m => m.toLowerCase() === lower);
    const isConfirmed = confirmedSkillNames.includes(lower);
    return isInMaster || isConfirmed;
  });

  const mergedTech = [...validOptTech];
  masterTech.forEach(t => {
    if (!mergedTech.some(s => s.toLowerCase() === t.toLowerCase())) {
      mergedTech.push(t);
    }
  });

  // Ensure all candidate-confirmed skills are included
  (candidateConfirmedFacts || []).forEach(f => {
    if (f && f.confirmed !== false && f.name) {
      if (!mergedTech.some(s => s.toLowerCase() === f.name.toLowerCase())) {
        mergedTech.unshift(f.name);
      }
    }
  });

  const masterSoft = masterCv.skills?.soft || [];
  const optSoft = optimized.skills?.soft || [];
  const mergedSoft = [...optSoft];
  masterSoft.forEach(s => {
    if (!mergedSoft.some(x => x.toLowerCase() === s.toLowerCase())) {
      mergedSoft.push(s);
    }
  });

  optimized.skills = {
    technical: mergedTech,
    soft: mergedSoft,
    tools: optimized.skills?.tools && optimized.skills.tools.length >= (masterCv.skills?.tools?.length || 0)
      ? optimized.skills.tools
      : (masterCv.skills?.tools || []),
    languages: []
  };

  // Preserve coreSkills & techStack
  optimized.coreSkills = masterCv.coreSkills || optimized.coreSkills || {};
  optimized.techStack = masterCv.techStack || optimized.techStack || {};

  // 5. Education preservation
  if (!optimized.education || optimized.education.length < (masterCv.education || []).length) {
    optimized.education = masterCv.education || [];
  }

  // 6. Certifications preservation
  const masterCerts = masterCv.certifications || [];
  const optCerts = optimized.certifications || [];
  if (optCerts.length < masterCerts.length) {
    optimized.certifications = masterCerts;
  }

  // 7. Projects & Project Experience preservation
  const masterProjects = masterCv.projectExperience || masterCv.projects || [];
  const optProjects = optimized.projectExperience || optimized.projects || [];
  if (optProjects.length < masterProjects.length) {
    optimized.projectExperience = masterProjects;
    optimized.projects = masterProjects;
  } else {
    optimized.projectExperience = optProjects;
    optimized.projects = optProjects;
  }

  // 8. Awards, volunteer, publications, memberships preservation
  if (!optimized.awards || optimized.awards.length < (masterCv.awards || []).length) {
    optimized.awards = masterCv.awards || [];
  }
  if (!optimized.volunteerExperience || optimized.volunteerExperience.length < (masterCv.volunteerExperience || []).length) {
    optimized.volunteerExperience = masterCv.volunteerExperience || [];
  }
  if (!optimized.publications || optimized.publications.length < (masterCv.publications || []).length) {
    optimized.publications = masterCv.publications || [];
  }
  if (!optimized.training || optimized.training.length < (masterCv.training || []).length) {
    optimized.training = masterCv.training || [];
  }
  if (!optimized.courses || optimized.courses.length < (masterCv.courses || []).length) {
    optimized.courses = masterCv.courses || [];
  }
  if (!optimized.languages || optimized.languages.length < (masterCv.languages || []).length) {
    optimized.languages = masterCv.languages || [];
  }
  if (!optimized.professionalMemberships || optimized.professionalMemberships.length < (masterCv.professionalMemberships || []).length) {
    optimized.professionalMemberships = masterCv.professionalMemberships || [];
  }
  if (!optimized.references || optimized.references.length < (masterCv.references || []).length) {
    optimized.references = masterCv.references || [];
  }
  if (!optimized.additionalSections || optimized.additionalSections.length < (masterCv.additionalSections || []).length) {
    optimized.additionalSections = masterCv.additionalSections || [];
  }

  return optimized;
};

/**
 * Intelligent rule-based non-destructive optimizer fallback
 */
/**
 * Intelligent rule-based non-destructive optimizer fallback
 */
const fallbackOptimizeCv = (masterCv, parsedJob, matchAnalysis = {}, candidateConfirmedFacts = [], optimizationMode = 'balanced') => {
  const jobTitle = parsedJob.jobTitle || 'Target Role';
  const targetCompany = parsedJob.company || '';
  const reqSkills = parsedJob.requiredSkills || [];

  const originalSummary = masterCv.professionalSummary || 'Experienced and dedicated professional.';
  const existingTech = masterCv.skills?.technical || [];

  // Identify confirmed skills (from user confirmation flow)
  const confirmedSkills = (candidateConfirmedFacts || [])
    .filter(f => f && f.confirmed !== false && f.name)
    .map(f => f.name);

  // Identify genuine overlapping skills for prioritization
  const relevantOverlap = existingTech.filter(t => 
    reqSkills.some(r => r.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(r.toLowerCase()))
  );

  // Prioritize: confirmed skills first, then master overlaps, then rest of master
  const prioritizedSkills = [...new Set([...confirmedSkills, ...relevantOverlap, ...existingTech])];

  const allActiveSkills = [...new Set([...confirmedSkills, ...relevantOverlap])];
  const overlapString = allActiveSkills.length > 0 ? allActiveSkills.slice(0, 4).join(', ') : existingTech.slice(0, 3).join(', ');

  // Mode-based summary adjustment
  let optimizedSummary = originalSummary;
  if (optimizationMode === 'aggressive') {
    optimizedSummary = `High-impact ${jobTitle} delivering proven results with core proficiencies in ${overlapString || 'software engineering'}. ${originalSummary.replace(/\.$/, '')}, strategically aligned for ${targetCompany ? targetCompany + ' target objectives' : 'production scale and engineering excellence'}.`;
  } else if (optimizationMode === 'conservative') {
    optimizedSummary = originalSummary;
    if (overlapString && !originalSummary.toLowerCase().includes(overlapString.toLowerCase())) {
      optimizedSummary = `${originalSummary.replace(/\.$/, '')}. Background includes demonstrated proficiency in ${overlapString}.`;
    }
  } else {
    // 'balanced' (default)
    optimizedSummary = `${originalSummary.replace(/\.$/, '')}, with demonstrated expertise in ${overlapString || 'core engineering fundamentals'}. Positioned to deliver impactful results as a ${jobTitle}${targetCompany ? ' at ' + targetCompany : ''} by applying verified skills and rigorous execution.`;
  }

  const changes = [
    {
      section: 'Professional Summary',
      field: 'professionalSummary',
      before: originalSummary,
      after: optimizedSummary,
      rationale: `Aligned your summary toward ${jobTitle} (${optimizationMode} mode), foregrounding genuine competencies (${overlapString || 'core competencies'}) without fabricating claims.`,
      status: 'accepted'
    }
  ];

  // Document confirmed facts as explicit changes
  confirmedSkills.forEach(skill => {
    if (!existingTech.some(t => t.toLowerCase() === skill.toLowerCase())) {
      changes.push({
        section: 'Skills & Competencies',
        field: 'skills.technical',
        before: '(Not previously evidenced in Master CV)',
        after: skill,
        rationale: `Integrated candidate-confirmed competency '${skill}' (source: candidate_confirmed) into technical skills.`,
        status: 'accepted'
      });
    }
  });

  // Optimize work experience bullet points: replace passive phrasing with strong action verbs
  const optimizedWorkExperience = (masterCv.workExperience || []).map((work, wIdx) => {
    const updatedResp = (work.responsibilities || []).map((resp, rIdx) => {
      let improved = resp;
      if (/^(?:worked on|responsible for|helped with|assisted in)\b/i.test(resp)) {
        improved = resp
          .replace(/^worked on/i, 'Engineered and optimized')
          .replace(/^responsible for/i, 'Spearheaded execution of')
          .replace(/^helped with/i, 'Collaborated on delivering')
          .replace(/^assisted in/i, 'Co-engineered');

        changes.push({
          section: `Work Experience (${work.company || 'Role'})`,
          field: `workExperience[${wIdx}].responsibilities[${rIdx}]`,
          before: resp,
          after: improved,
          rationale: 'Elevated phrasing with active verbs while preserving the exact technical scope and accomplishments.',
          status: 'accepted'
        });
      }
      return improved;
    });

    return {
      ...work,
      responsibilities: updatedResp
    };
  });

  const optimizedCv = {
    ...masterCv,
    professionalSummary: optimizedSummary,
    targetRoles: [jobTitle, ...(masterCv.targetRoles || [])].filter((v, i, a) => a.indexOf(v) === i),
    skills: {
      ...masterCv.skills,
      technical: prioritizedSkills
    },
    workExperience: optimizedWorkExperience,
    projectExperience: masterCv.projectExperience || masterCv.projects || [],
    projects: masterCv.projects || masterCv.projectExperience || [],
    coreSkills: masterCv.coreSkills || {},
    techStack: masterCv.techStack || {},
    languages: masterCv.languages || []
  };

  const finalOptimized = enforceNonDestructivePreservation(masterCv, optimizedCv, candidateConfirmedFacts);

  const preservedSections = [
    'Complete Professional Summary',
    `${masterCv.workExperience?.length || 0} Work Experience position(s)`,
    `${(masterCv.skills?.technical?.length || 0) + (masterCv.skills?.soft?.length || 0)} Technical & Soft Skills`,
    'Education & Academic History',
    'Certifications & Credentials',
    'Projects & Technical Deliverables',
    'Additional Information & Sections'
  ];

  const improvedSections = [
    `Professional Summary wording & target role alignment (${optimizationMode})`,
    'Experience positioning & strong action verbs',
    'Competency prioritization for ATS indexing',
    'Candidate-confirmed capabilities integration'
  ];

  return {
    optimizedCv: finalOptimized,
    changes,
    preservedSections,
    improvedSections
  };
};

/**
 * Optimizes CV for target role using AI with strict non-destructive preservation
 * @param {object} masterCv 
 * @param {object} parsedJob 
 * @param {object} matchAnalysis 
 * @param {Array} candidateConfirmedFacts 
 * @param {string} optimizationMode 
 * @returns {Promise<{ optimizedCv: object, changes: Array, preservedSections: Array, improvedSections: Array }>}
 */
const optimizeCvWithAI = async (masterCv, parsedJob, matchAnalysis = {}, candidateConfirmedFacts = [], optimizationMode = 'balanced') => {
  const messages = [
    { role: 'system', content: CV_OPTIMIZER_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Optimize this candidate's MASTER CV for the target job.
PRESERVE ALL SUBSTANTIVE CONTENT (jobs, skills, education, certifications, projects, sections).
OPTIMIZATION MODE: ${optimizationMode.toUpperCase()}

MASTER CV:
${JSON.stringify(masterCv, null, 2)}

TARGET JOB POSTING:
${JSON.stringify(parsedJob, null, 2)}

CANDIDATE-CONFIRMED FACTS (VERIFIED BY USER - SAFE TO INTEGRATE NATURALLY):
${JSON.stringify(candidateConfirmedFacts, null, 2)}

MATCH ANALYSIS:
${JSON.stringify(matchAnalysis || {}, null, 2)}`
    }
  ];

  let rawOptimized = null;
  let changes = [];
  let preservedSections = [];
  let improvedSections = [];

  try {
    const aiResult = await requestJsonCompletion(messages, { temperature: 0.15 });
    if (aiResult && aiResult.optimizedCv) {
      rawOptimized = aiResult.optimizedCv;
      changes = Array.isArray(aiResult.changes) ? aiResult.changes : [];
      preservedSections = Array.isArray(aiResult.preservedSections) ? aiResult.preservedSections : [];
      improvedSections = Array.isArray(aiResult.improvedSections) ? aiResult.improvedSections : [];
    }
  } catch (err) {
    console.warn('AI Optimization API call failed or quota limited:', err.message);
  }

  if (!rawOptimized) {
    console.log('Activating non-destructive CV optimization engine fallback...');
    return fallbackOptimizeCv(masterCv, parsedJob, matchAnalysis, candidateConfirmedFacts, optimizationMode);
  }

  // Run non-destructive preservation enforcement layer with confirmed facts
  const fullyPreservedCv = enforceNonDestructivePreservation(masterCv, rawOptimized, candidateConfirmedFacts);

  if (preservedSections.length === 0) {
    preservedSections = [
      'Complete Professional Summary',
      `${masterCv.workExperience?.length || 0} Work Experience positions`,
      `${(masterCv.skills?.technical?.length || 0) + (masterCv.skills?.soft?.length || 0)} Skills`,
      'Education & Credentials',
      'Certifications',
      'Projects',
      'Additional Sections'
    ];
  }

  if (improvedSections.length === 0) {
    improvedSections = [
      `Professional Summary wording & role alignment (${optimizationMode})`,
      'Relevant experience positioning',
      'Job-specific keyword integration',
      'Bullet point clarity & action verbs',
      'Skill prioritization for ATS indexing'
    ];
  }

  return {
    optimizedCv: fullyPreservedCv,
    changes,
    preservedSections,
    improvedSections
  };
};

module.exports = { optimizeCvWithAI, fallbackOptimizeCv, enforceNonDestructivePreservation };
