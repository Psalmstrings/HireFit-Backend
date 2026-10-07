require('dotenv').config();
const assert = require('assert');

const API_BASE = 'http://localhost:5000/api';

async function testMasterCvPreservation() {
  console.log('🧪 Testing Master CV Complete Extraction & Non-Destructive Optimization...\n');

  // 1. Comprehensive Multi-Section CV text simulation
  const richCvText = `
ALEXANDER D. RIVERA
alex.rivera@example.com | +1 (555) 234-5678 | San Francisco, CA
linkedin.com/in/alexrivera-dev | github.com/alexrivera-tech

PROFESSIONAL SUMMARY
Dynamic and high-performing Lead Software Architect with over 12 years of comprehensive experience delivering distributed cloud architectures, high-volume transactional platforms, and modern web applications. Demonstrated track record of mentoring multi-disciplinary engineering teams and driving engineering excellence across tier-1 technology organizations.

CAREER OBJECTIVE
To architect resilient, enterprise-grade cloud solutions and drive developer productivity within a mission-critical technology team.

WORK EXPERIENCE

Principal Platform Architect | Horizon Cloud Technologies, San Francisco, CA
2021 – Present
- Architected enterprise multi-region Kubernetes platform supporting 45+ microservices and 10M daily requests.
- Spearheaded company-wide migration from legacy monolith to event-driven Kafka and Go architecture.
- Mentored 14 senior engineers across distributed time zones in architecture review practices.
- Reduced overall cloud infrastructure spend by 28% through autoscaling optimization.

Senior Full Stack Engineer | Apex Financial Systems, New York, NY
2018 – 2021
- Engineered real-time trade settlement engine processing $50M+ in daily transaction volume.
- Developed reactive trader dashboard in React, TypeScript, and WebSockets with sub-50ms latency.
- Implemented robust end-to-end telemetry and distributed tracing with OpenTelemetry and Datadog.
- Decreased reconciliation discrepancies by 42% via automated ledger checks.

Full Stack Software Engineer | BrightWave Digital, Austin, TX
2015 – 2018
- Built customer-facing analytics portal utilizing Node.js, Express, PostgreSQL, and Angular.
- Designed secure multi-tenant authentication system adhering strictly to SOC 2 compliance.
- Collaborated closely with product managers to launch 6 major enterprise feature sets on time.

Software Developer | DataCraft Solutions, Chicago, IL
2013 – 2015
- Developed and maintained automated ETL data pipelines in Python and PostgreSQL.
- Authored comprehensive test suites achieving 88% unit test coverage.
- Optimized database query bottlenecks reducing batch processing execution time from 4 hours to 45 minutes.

Junior Web Developer | NextGen Media, Chicago, IL
2011 – 2013
- Built responsive client websites using HTML5, CSS3, JavaScript, and PHP.
- Handled cross-browser compatibility and mobile optimization across all deliverables.

CORE COMPETENCIES & SKILLS
Technical Skills: JavaScript, TypeScript, React, Node.js, Python, Go, Kubernetes, Docker, AWS, PostgreSQL, MongoDB, Redis, GraphQL, Kafka, Microservices
Tools & Platforms: Git, GitHub Actions, Terraform, Datadog, Prometheus, Jira, VS Code
Soft Skills: Technical Leadership, Cross-Functional Collaboration, Architectural Governance, Mentorship
Languages: English (Native), Spanish (Fluent), German (Conversational)

EDUCATION
Master of Science in Computer Science | University of Illinois at Urbana-Champaign (2014 – 2016)
Bachelor of Science in Software Engineering | Northwestern University (2007 – 2011)

CERTIFICATIONS
- AWS Certified Solutions Architect - Professional
- Certified Kubernetes Administrator (CKA)
- Google Cloud Certified Professional Cloud Architect
- HashiCorp Certified: Terraform Associate
- Certified ScrumMaster (CSM)

KEY PROJECTS
- CloudMesh Observability Hub: Open-source distributed tracing dashboard used by 12,000+ engineers globally.
- Nexus Data Router: High-throughput Go packet proxy handling 100k events/sec.
- FinLedger Zero-Knowledge Proof: Experimental cryptographic ledger prototype using Rust and WebAssembly.
- SwiftDeploy CI Runner: Lightweight CLI runner for fast local container testing.

VOLUNTEER & COMMUNITY
- CodeInSchools Mentor: Volunteered 120+ hours teaching algorithms to high school students.
- Open Source Contributor: Active contributor to Kubernetes and Envoy documentation.

AWARDS & HONORS
- Apex Systems Engineering Excellence Award (2020)
- Horizon Technologies Innovation Spotlight (2022)

PUBLICATIONS & SPEAKING
- "Scaling Distributed Event Brokers" – Cloud Architecture Conference 2023 keynote.

REFERENCES
Professional references available upon request.
`;

  // 3. Test Direct Parsing with complete extraction
  const { parseCvWithAI, validateContentCompleteness } = require('../src/services/ai/cvParserService');
  const parsedMaster = await parseCvWithAI(richCvText);

  console.log('1. Checking Master CV Extraction Completeness:');
  console.log(`   - Work Experiences extracted: ${parsedMaster.workExperience.length}`);
  console.log(`   - Technical Skills extracted: ${parsedMaster.skills?.technical?.length}`);
  console.log(`   - Education count: ${parsedMaster.education?.length}`);
  console.log(`   - Certifications count: ${parsedMaster.certifications?.length}`);
  console.log(`   - Projects count: ${parsedMaster.projects?.length}`);
  console.log(`   - Summary preserved: ${Boolean(parsedMaster.professionalSummary)}`);

  assert.strictEqual(parsedMaster.workExperience.length, 5, 'Master CV must capture ALL 5 work experiences');
  assert.ok(parsedMaster.skills?.technical?.length >= 10, 'Master CV must capture all substantive technical skills');
  assert.strictEqual(parsedMaster.education.length, 2, 'Master CV must capture both educational degrees');
  assert.strictEqual(parsedMaster.certifications.length, 5, 'Master CV must capture all 5 certifications');
  assert.strictEqual(parsedMaster.projects.length, 4, 'Master CV must capture all 4 projects');
  assert.ok(parsedMaster.professionalSummary.includes('Lead Software Architect'), 'Master CV must preserve exact professional summary');

  console.log('   ✓ Master CV Extraction passed 100% complete content preservation!\n');

  // 4. Test Non-Destructive Job-Specific Optimization
  console.log('2. Testing Non-Destructive Job-Specific Optimization:');
  const { optimizeCvWithAI } = require('../src/services/ai/cvOptimizationService');

  const targetJob = {
    jobTitle: 'Principal Cloud & Kubernetes Engineer',
    company: 'Fintech Scaleup',
    requiredSkills: ['Kubernetes', 'Go', 'AWS', 'Docker', 'Microservices', 'Kafka']
  };

  const { optimizedCv, changes, preservedSections, improvedSections } = await optimizeCvWithAI(
    parsedMaster,
    targetJob,
    {}
  );

  console.log(`   - Work Experiences after optimization: ${optimizedCv.workExperience.length}`);
  console.log(`   - Education after optimization: ${optimizedCv.education.length}`);
  console.log(`   - Certifications after optimization: ${optimizedCv.certifications.length}`);
  console.log(`   - Projects after optimization: ${optimizedCv.projects.length}`);
  console.log(`   - Number of proposed improvements: ${changes.length}`);

  // CRITICAL CHECKS: Content count must NOT decrease!
  assert.strictEqual(optimizedCv.workExperience.length, 5, 'Optimization MUST NOT drop any work experience positions');
  assert.strictEqual(optimizedCv.education.length, 2, 'Optimization MUST NOT drop education');
  assert.strictEqual(optimizedCv.certifications.length, 5, 'Optimization MUST NOT drop certifications');
  assert.strictEqual(optimizedCv.projects.length, 4, 'Optimization MUST NOT drop projects');
  assert.ok(optimizedCv.professionalSummary.length > 30, 'Optimization must preserve substantive professional summary');

  // Verify skills were prioritized, not erased
  const hasKubernetesFirst = optimizedCv.skills.technical.indexOf('Kubernetes') !== -1;
  assert.ok(hasKubernetesFirst, 'Relevant skills must remain present');
  assert.ok(optimizedCv.skills.technical.length >= parsedMaster.skills.technical.length, 'No skills should be discarded');

  console.log('   ✓ Optimized CV verified: zero content loss, all 5 jobs & credentials intact!\n');

  console.log('🎉 ALL MASTER CV PRESERVATION & NON-DESTRUCTIVE OPTIMIZATION TESTS PASSED!\n');
}

testMasterCvPreservation().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
