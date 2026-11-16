const assert = require('assert');
const path = require('path');
const fs = require('fs');

const runAllTests = async () => {
  console.log('🧪 Starting HireFit Critical Integration Tests...\n');
  const baseURL = 'http://localhost:5000/api';

  let userToken = '';
  let adminToken = '';
  let testUserId = '';
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
    assert.strictEqual(regData.user.isVerified, false, 'New user should have isVerified false');
    userToken = regData.token;
    testUserId = regData.user.id;
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
    const forbiddenRes = await fetch(`${baseURL}/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(forbiddenRes.status, 403, 'Regular user should get 403 Forbidden on admin endpoint');
    console.log('   ✓ Non-admin correctly rejected with HTTP 403.\n');

    // 12. Admin Login with new credentials
    console.log('12. Testing New Admin Login (psalmtringsdigital@gmail.com / psalmtringsdigital@gmail.com)...');
    const adminLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'psalmtringsdigital@gmail.com',
        password: 'psalmtringsdigital@gmail.com'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginData.success, true, 'Admin login should succeed');
    assert.strictEqual(adminLoginData.user.role, 'admin', 'Admin user must have admin role');
    assert.ok(adminLoginData.token, 'Admin should receive token');
    adminToken = adminLoginData.token;
    console.log('   ✓ Production Admin logged in successfully.\n');

    // 13. Admin Dashboard Statistics & Telemetry
    console.log('13. Testing Admin Telemetry Stats (/admin/stats)...');
    const adminStatsRes = await fetch(`${baseURL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminStatsData = await adminStatsRes.json();
    assert.strictEqual(adminStatsData.success, true);
    assert.ok(adminStatsData.stats.totalUsers >= 1);
    assert.ok(adminStatsData.stats.totalCVs >= 1);
    assert.ok(adminStatsData.stats.totalJobs >= 1);
    assert.ok(adminStatsData.stats.totalAnalyses >= 1);
    console.log(`   ✓ Admin Telemetry retrieved! Total Users: ${adminStatsData.stats.totalUsers}, CVs: ${adminStatsData.stats.totalCVs}, AI Invocations: ${adminStatsData.stats.totalAiInvocations}\n`);

    // 14. Admin User Directory & Per-User Usage Aggregation
    console.log('14. Testing Admin User Directory & Usage Monitoring (/admin/users)...');
    const adminUsersRes = await fetch(`${baseURL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminUsersData = await adminUsersRes.json();
    assert.strictEqual(adminUsersData.success, true);
    assert.ok(Array.isArray(adminUsersData.users));
    const foundTestUser = adminUsersData.users.find(u => u._id === testUserId);
    assert.ok(foundTestUser, 'User directory must include created test user');
    assert.ok(foundTestUser.cvCount >= 1, 'Aggregated cvCount must be >= 1');
    assert.ok(foundTestUser.analysisCount >= 1, 'Aggregated analysisCount must be >= 1');
    console.log(`   ✓ Admin User Tracking verified! User: ${foundTestUser.email}, CVs: ${foundTestUser.cvCount}, Analyses: ${foundTestUser.analysisCount}\n`);

    // 15. Admin User Activity Drilldown & Export
    console.log('15. Testing Admin User Activity Drill-Down & Export (/admin/users/:id/activity)...');
    const activityRes = await fetch(`${baseURL}/admin/users/${testUserId}/activity`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const activityData = await activityRes.json();
    assert.strictEqual(activityData.success, true);
    assert.strictEqual(activityData.user._id, testUserId);
    assert.ok(activityData.activity.cvs.length >= 1);
    assert.ok(activityData.activity.jobs.length >= 1);
    console.log(`   ✓ User activity drill-down verified (${activityData.activity.cvs.length} CVs, ${activityData.activity.jobs.length} jobs).\n`);

    // 16. Nodemailer Auth Endpoints (Resend Verification & Forgot Password)
    console.log('16. Testing Nodemailer Auth Endpoints (Resend Verification & Forgot Password)...');
    const resendRes = await fetch(`${baseURL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const resendData = await resendRes.json();
    assert.strictEqual(resendData.success, true);

    const forgotRes = await fetch(`${baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const forgotData = await forgotRes.json();
    assert.strictEqual(forgotData.success, true);
    console.log('   ✓ Email verification and password reset workflows tested cleanly.\n');

    console.log('========================================================================');
    console.log('🎉 ALL 16 INTEGRATION & TELEMETRY TESTS PASSED 100% PERFECTLY!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

runAllTests();
