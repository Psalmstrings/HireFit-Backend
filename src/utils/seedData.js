require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const CV = require('../models/CV');
const Job = require('../models/Job');
const CVVersion = require('../models/CVVersion');
const CVAnalysis = require('../models/CVAnalysis');
const Application = require('../models/Application');

const sampleCvData = {
  personalInfo: {
    fullName: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '+1 415 555 0198',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexjohnson',
    portfolio: 'github.com/alexjohnson'
  },
  professionalSummary: 'Full Stack Software Engineer with 5 years of experience building production-grade web applications. Proven expertise in React, Node.js, and cloud-native architectures. Strong track record of delivering scalable, performant software solutions in fast-paced startup and enterprise environments.',
  targetRoles: ['Senior Software Engineer', 'Full Stack Developer', 'Frontend Engineer'],
  skills: {
    technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'Python', 'PostgreSQL', 'MongoDB', 'REST APIs', 'GraphQL'],
    soft: ['Cross-functional collaboration', 'Agile/Scrum', 'Mentoring junior developers', 'Technical documentation'],
    tools: ['Git', 'Docker', 'AWS (EC2, S3, Lambda)', 'Jira', 'Figma', 'VS Code', 'Postman'],
    languages: ['English (Native)', 'Spanish (Conversational)']
  },
  workExperience: [
    {
      company: 'TechFlow Inc.',
      jobTitle: 'Senior Software Engineer',
      location: 'San Francisco, CA (Hybrid)',
      startDate: 'January 2022',
      endDate: 'Present',
      current: true,
      responsibilities: [
        'Architected and led development of a new customer-facing React dashboard, reducing user task completion time by 42%.',
        'Built and maintained 12+ RESTful microservices using Node.js/Express, serving 500,000+ monthly active users.',
        'Implemented automated CI/CD pipelines using GitHub Actions and AWS, reducing deployment cycles from 2 weeks to 2 days.',
        'Mentored a team of 4 junior engineers through weekly code reviews and pair programming sessions.'
      ],
      achievements: [
        'Led migration of monolithic backend to microservices architecture, improving system uptime from 97.2% to 99.8%.',
        'Reduced API response times by 35% through Redis caching and query optimization.'
      ]
    },
    {
      company: 'StartupLabs',
      jobTitle: 'Software Engineer',
      location: 'Remote',
      startDate: 'June 2020',
      endDate: 'December 2021',
      current: false,
      responsibilities: [
        'Developed core e-commerce platform features using React, Redux, and Node.js backend.',
        'Integrated third-party payment APIs (Stripe, PayPal) enabling \$2M in annual transaction volume.',
        'Collaborated with design team to implement responsive UI components, improving mobile conversion rate by 28%.'
      ],
      achievements: [
        'Delivered MVP e-commerce platform in 3 months, securing Series A funding round.'
      ]
    }
  ],
  education: [
    {
      institution: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: '2016',
      endDate: '2020'
    }
  ],
  certifications: ['AWS Certified Developer – Associate', 'MongoDB Certified Developer'],
  projects: [
    {
      name: 'OpenSource Task Manager',
      description: 'A collaborative project management web app with real-time updates and team workspaces.',
      role: 'Lead Developer',
      technologies: ['React', 'Node.js', 'WebSockets', 'PostgreSQL'],
      url: 'github.com/alexjohnson/taskmanager',
      achievements: ['2,400+ GitHub stars', 'Used by 150+ development teams globally']
    }
  ],
  awards: ['TechFlow "Engineer of the Quarter" – Q3 2023'],
  volunteerExperience: ['Volunteer mentor at Code2040, guiding early-career engineers from underrepresented backgrounds.'],
  additionalInformation: []
};

const sampleJobData = {
  jobTitle: 'Senior Frontend Engineer',
  company: 'Acme Corp',
  location: 'San Francisco, CA / Remote',
  seniority: 'Senior',
  industry: 'SaaS Technology',
  remoteType: 'Hybrid',
  requiredSkills: ['React', 'TypeScript', 'JavaScript', 'REST APIs', 'CSS3'],
  preferredSkills: ['GraphQL', 'AWS', 'Testing (Jest, Cypress)', 'Design Systems'],
  responsibilities: [
    'Lead the development of next-generation React components for our enterprise SaaS platform.',
    'Collaborate closely with design and product teams to deliver polished user interfaces.',
    'Champion best practices in testing, accessibility, and performance optimization.',
    'Mentor junior frontend engineers through code reviews and technical guidance.'
  ],
  qualifications: [
    '4+ years of professional frontend/full-stack experience.',
    'Expert-level proficiency in React and TypeScript.',
    'Strong communication and cross-team collaboration abilities.'
  ],
  keywords: ['React', 'TypeScript', 'Frontend', 'SaaS', 'Scalability', 'Component Architecture'],
  experienceRequirements: ['4+ years professional React experience', 'Production TypeScript experience'],
  educationRequirements: ["Bachelor's degree in Computer Science, STEM, or equivalent experience"],
  certifications: [],
  tools: ['Git', 'Figma', 'Jira'],
  softSkills: ['Mentorship', 'Communication', 'Adaptability']
};

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await connectDB();

    // Clear existing seed data (dev use only)
    console.log('Clearing existing seed data...');
    await User.deleteMany({ email: { $in: ['demo@hirefit.dev', 'admin@hirefit.dev'] } });

    // Create demo user
    console.log('Creating demo user...');
    const demoUser = await User.create({
      name: 'Alex Johnson (Demo)',
      email: 'demo@hirefit.dev',
      password: 'DemoPass123!',
      role: 'user'
    });

    // Create admin user
    console.log('Creating admin user...');
    await User.create({
      name: 'HireFit Admin',
      email: 'admin@hirefit.dev',
      password: 'AdminPass123!',
      role: 'admin'
    });

    // Create demo CV
    console.log('Creating demo CV...');
    const cv = await CV.create({
      userId: demoUser._id,
      title: 'Alex Johnson — Full Stack Engineer CV',
      originalFile: {
        url: '/uploads/sample-cv.pdf',
        publicId: 'sample-cv.pdf',
        fileName: 'Alex_Johnson_CV.pdf',
        fileType: 'application/pdf',
        fileSize: 48234,
        storageType: 'local'
      },
      extractedRawText: `Alex Johnson | alex.johnson@email.com | +1 415 555 0198 | San Francisco, CA\n\n${sampleCvData.professionalSummary}\n\nSkills: JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MongoDB, REST APIs, GraphQL, AWS`,
      parsedData: sampleCvData,
      isParsed: true,
      parseStatus: 'parsed',
      versionsCount: 1
    });

    // Create initial CV version
    const version = await CVVersion.create({
      cvId: cv._id,
      userId: demoUser._id,
      versionNumber: 1,
      label: 'Original Upload',
      cvData: sampleCvData
    });

    cv.activeVersionId = version._id;
    await cv.save();

    // Create demo job
    console.log('Creating demo job...');
    const job = await Job.create({
      userId: demoUser._id,
      title: 'Senior Frontend Engineer — Acme Corp',
      company: 'Acme Corp',
      rawText: `Senior Frontend Engineer — Acme Corp\n\nWe are looking for a Senior Frontend Engineer to join our team.\n\nRequired Skills: React, TypeScript, JavaScript, REST APIs, CSS3\nPreferred: GraphQL, AWS, Testing\n\n4+ years of React experience required.`,
      structuredData: sampleJobData,
      isParsed: true,
      sourceType: 'pasted'
    });

    // Create demo analysis
    console.log('Creating demo analysis...');
    await CVAnalysis.create({
      userId: demoUser._id,
      cvId: cv._id,
      jobId: job._id,
      overallScore: 84,
      scoreLabel: 'AI Job Match Score (Estimate based on supplied CV and Job Description)',
      categoryScores: {
        skillsMatch: 91,
        experienceMatch: 87,
        keywordMatch: 88,
        responsibilityMatch: 80,
        educationMatch: 100,
        atsReadiness: 86
      },
      matchedSkills: [
        { skill: 'React', candidateEvidence: 'Extensive React production experience at TechFlow', jobRequirement: 'Expert-level React required' },
        { skill: 'JavaScript', candidateEvidence: 'Core language for all projects', jobRequirement: 'Strong JavaScript fundamentals' },
        { skill: 'REST APIs', candidateEvidence: '12+ microservices built at TechFlow', jobRequirement: 'REST API integration required' }
      ],
      partialMatches: [
        { skill: 'TypeScript', candidateExperience: 'Listed in technical skills', missingAspect: 'Specific TypeScript typing in production not highlighted in bullet points' }
      ],
      missingSkills: [
        { skill: 'Jest/Cypress Testing', importance: 'Medium', note: 'Automated testing framework experience was not identified in your supplied CV.' }
      ],
      evidenceGaps: [
        { requirement: 'Design Systems experience', explanation: 'The role emphasizes design system work; your CV shows Figma usage but not component library development at scale.' }
      ],
      strengths: [
        'Strong overlap in core React and JavaScript competencies.',
        'Demonstrated mentoring experience aligning with role expectations.',
        'Quantified engineering achievements (42% UX improvement, 99.8% uptime).'
      ],
      recommendations: [
        { title: 'Highlight TypeScript Usage', category: 'Skills', description: 'Explicitly mention TypeScript in specific bullet points where it was used.', priority: 'High' },
        { title: 'Add Testing Coverage', category: 'Experience', description: 'If you wrote unit or integration tests, add them to your bullet points with framework names.', priority: 'Medium' }
      ],
      atsChecklist: [
        { item: 'Contact Information', status: 'good', feedback: 'Email, phone, and location clearly visible.' },
        { item: 'Standard Section Headings', status: 'good', feedback: 'All major sections properly labeled.' },
        { item: 'Keyword Alignment', status: 'warning', feedback: 'TypeScript and testing keywords could be more prominent.' },
        { item: 'Quantified Achievements', status: 'good', feedback: 'Strong measurable outcomes throughout work history.' }
      ]
    });

    // Create demo application
    console.log('Creating demo application...');
    await Application.create({
      userId: demoUser._id,
      company: 'Acme Corp',
      jobTitle: 'Senior Frontend Engineer',
      jobUrl: 'https://acmecorp.com/careers/senior-frontend',
      location: 'San Francisco, CA / Remote',
      status: 'Applied',
      cvId: cv._id,
      jobId: job._id,
      matchScore: 84,
      appliedDate: new Date(),
      notes: 'Applied via company website. Strong match on core technologies. Follow up in 1 week.'
    });

    console.log('\n✅ Seed data created successfully!');
    console.log('   Demo login: demo@hirefit.dev / DemoPass123!');
    console.log('   Admin login: admin@hirefit.dev / AdminPass123!\n');

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    await disconnectDB();
    process.exit(1);
  }
};

seedDatabase();
