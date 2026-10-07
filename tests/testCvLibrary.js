const assert = require('assert');

const API_BASE = 'http://localhost:5000/api';

async function testCvLibraryEndpoints() {
  console.log('🧪 Testing CV Library & Optimizer extensions...\n');

  // 1. Login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@hirefit.dev',
      password: 'DemoPass123!'
    })
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true, 'Login should succeed');
  const token = loginData.token;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Fetch CVs
  const cvsRes = await fetch(`${API_BASE}/cvs`, { headers: authHeaders });
  const cvsData = await cvsRes.json();
  assert.strictEqual(cvsData.success, true);
  console.log(`✓ Fetched ${cvsData.cvs.length} CVs for user.`);
  if (cvsData.cvs.length === 0) {
    console.log('No CV found to test rename. Skipping remainder.');
    return;
  }

  const testCv = cvsData.cvs[0];

  // 3. Test Rename
  const originalTitle = testCv.title;
  const updatedTitle = `${originalTitle} (Library Tested)`;
  const renameRes = await fetch(`${API_BASE}/cvs/${testCv._id}/rename`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      title: updatedTitle,
      targetRole: 'Full Stack Architect'
    })
  });
  const renameData = await renameRes.json();
  assert.strictEqual(renameData.success, true, 'Rename should succeed');
  assert.strictEqual(renameData.cv.title, updatedTitle);
  assert.strictEqual(renameData.cv.targetRole, 'Full Stack Architect');
  console.log('✓ PATCH /api/cvs/:id/rename verified successfully!');

  // Restore title
  await fetch(`${API_BASE}/cvs/${testCv._id}/rename`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      title: originalTitle,
      targetRole: testCv.targetRole || ''
    })
  });
  console.log('✓ Restored original CV title.');

  // 4. Test direct optimization with raw job description
  const optimizeRes = await fetch(`${API_BASE}/cvs/${testCv._id}/optimize`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      jobDescription: `
        Senior Backend Engineer position at Fintech Corp.
        Responsibilities: Build high-throughput microservices using Node.js, Express, PostgreSQL, and Docker.
        Qualifications: 5+ years of software development experience, experience with REST APIs and cloud infrastructure.
      `,
      jobTitle: 'Senior Backend Engineer',
      companyName: 'Fintech Corp',
      versionName: 'Fintech Corp Tailored Test'
    })
  });
  const optimizeData = await optimizeRes.json();
  assert.strictEqual(optimizeData.success, true, 'Direct job description optimize should succeed');
  assert.ok(optimizeData.version, 'Should create new version');
  console.log(`✓ POST /api/cvs/:id/optimize with direct job description succeeded!`);
  console.log(`  Version label: "${optimizeData.version.label}", Match Score: ${optimizeData.matchScore}%`);

  console.log('\n🎉 ALL CV LIBRARY AND OPTIMIZER EXTENSION TESTS PASSED 100%!\n');
}

testCvLibraryEndpoints().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
