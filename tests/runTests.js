const assert = require('assert');
const path = require('path');
const fs = require('fs');

const runAllTests = async () => {
  console.log('🧪 Starting HireFit Critical Integration Tests...\n');
  const baseURL = 'http://localhost:5000/api';

  let userToken = '';
  let adminToken = '';
  let testCvId = '';
  let testJobId = '';
  let testAnalysisId = '';

  try {
    // 1. Health check
    console.log('1. Testing /health endpoint...');
    const healthRes = await fetch(`${baseURL}/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.success, true);
    console.log('   ✓ Health check passed.\n');

    // 2. User Registration
    console.log('2. Testing User Registration...');
    const testEmail = `test_${Date.now()}@hirefit.dev`;
    const regRes = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Tester',
        email: testEmail,
        password: 'Password123!'
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regData.success, true);
    assert.ok(regData.token, 'Should return JWT token');
    userToken = regData.token;
    console.log(`   ✓ Registered user ${testEmail} with token.\n`);

    // 3. User Login
    console.log('3. Testing User Login...');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!'
      })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, true);
    assert.ok(loginData.token);
    console.log('   ✓ Login verification passed.\n');

    // 4. Protected Route & Auth Middleware
    console.log('4. Testing Protected Route (/users/me)...');
    const meRes = await fetch(`${baseURL}/users/me`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const meData = await meRes.json();
    assert.strictEqual(meData.success, true);
    assert.strictEqual(meData.user.email, testEmail);
    console.log('   ✓ Protected route correctly validated token.\n');

    // 5. Job Creation & Parsing
    console.log('5. Testing Job Creation & AI Parsing...');
    const jobRes = await fetch(`${baseURL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: 'Senior React Developer',
        rawText: `Senior React Developer needed at Acme Fintech.
Must have 4+ years React, JavaScript, TypeScript, REST APIs.
Preferred: Docker, AWS, GraphQL.
Responsibilities: Build enterprise web applications, lead UI architecture, mentor juniors.`
      })
    });
    const jobData = await jobRes.json();
    if (!jobData.success) {
      console.error('Job creation error response:', jobData);
    }
    assert.strictEqual(jobData.success, true);
    assert.ok(jobData.job._id);
    testJobId = jobData.job._id;
    console.log(`   ✓ Created job: ${jobData.job.structuredData?.jobTitle || jobData.job.title} with required skills: ${jobData.job.structuredData?.requiredSkills?.join(', ')}\n`);

    // 6. CV Creation & Parsing
    console.log('6. Testing CV Upload & Structured Text Parsing...');
    // Create a mock multipart form upload using FormData
    const sampleCvText = `Alex Johnson\nalex@example.com | +1 555 0199 | San Francisco\n\nFull Stack Engineer with 4 years experience in React, Node.js, JavaScript, REST APIs, and PostgreSQL.\n\nWork Experience:\nSenior Developer at WebCorp (2021-Present)\n- Built responsive React dashboards for 100k users.\n- Integrated RESTful APIs with Node.js backend.`;

    const blob = new Blob([sampleCvText], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'Alex_Johnson_CV.txt');
    formData.append('title', 'Alex Johnson Test CV');

    const cvRes = await fetch(`${baseURL}/cvs/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: formData
    });
    const cvData = await cvRes.json();
    if (!cvData.success) {
      console.error('CV upload error response:', cvData);
    }
    assert.strictEqual(cvData.success, true);
    assert.ok(cvData.cv.id);
    testCvId = cvData.cv.id;
    console.log(`   ✓ CV uploaded and parsed: ${cvData.cv.title}\n`);

    // 7. CV vs Job Matching Engine
    console.log('7. Testing CV vs Job Matching Engine...');
    const matchRes = await fetch(`${baseURL}/analysis/${testCvId}/${testJobId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const matchData = await matchRes.json();
    assert.strictEqual(matchData.success, true);
    assert.ok(typeof matchData.analysis.overallScore === 'number');
    assert.ok(matchData.analysis.categoryScores.skillsMatch !== undefined);
    assert.ok(Array.isArray(matchData.analysis.matchedSkills));
    assert.ok(Array.isArray(matchData.analysis.atsChecklist));
    testAnalysisId = matchData.analysis._id;
    console.log(`   ✓ Match calculated! Score: ${matchData.analysis.overallScore}%, Label: "${matchData.analysis.scoreLabel}"\n`);

    // 8. Zero-Fabrication CV Optimizer
    console.log('8. Testing Zero-Fabrication CV Optimizer...');
    const optRes = await fetch(`${baseURL}/cvs/${testCvId}/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ jobId: testJobId })
    });
    const optData = await optRes.json();
    assert.strictEqual(optData.success, true);
    assert.ok(optData.version);
    assert.ok(Array.isArray(optData.changes));
    console.log(`   ✓ CV optimized! Generated ${optData.changes.length} transparent before/after changes with rationales.\n`);

    // 9. Cover Letter Generation
    console.log('9. Testing Cover Letter Generation...');
    const clRes = await fetch(`${baseURL}/cover-letters/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        cvId: testCvId,
        jobId: testJobId,
        tone: 'professional'
      })
    });
    const clData = await clRes.json();
    assert.strictEqual(clData.success, true);
    assert.ok(clData.coverLetter.content.length > 50);
    console.log('   ✓ Cover letter generated based on verified CV content.\n');

    // 10. Application Tracker CRUD
    console.log('10. Testing Application Tracker CRUD...');
    const appRes = await fetch(`${baseURL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        company: 'Acme Fintech',
        jobTitle: 'Senior React Developer',
        status: 'Applied',
        cvId: testCvId,
        matchScore: matchData.analysis.overallScore
      })
    });
    const appData = await appRes.json();
    assert.strictEqual(appData.success, true);
    assert.strictEqual(appData.application.status, 'Applied');
    console.log('   ✓ Application created and linked with CV and match score.\n');

    // 11. Role-based Admin Protection Test
    console.log('11. Testing Role-based Access Control (User blocked from Admin)...');
    const adminRes = await fetch(`${baseURL}/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(adminRes.status, 403, 'Regular user should get 403 Forbidden on admin endpoint');
    console.log('   ✓ Non-admin correctly rejected with HTTP 403.\n');

    console.log('====================================================');
    console.log('🎉 ALL 11 CRITICAL INTEGRATION TESTS PASSED 100%!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

runAllTests();
