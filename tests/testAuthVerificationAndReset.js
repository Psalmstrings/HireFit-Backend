const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const { connectDB, disconnectDB } = require('../src/config/db');
const app = require('../src/app');
const User = require('../src/models/User');

const runAuthVerificationSuite = async () => {
  console.log('🧪 Starting Dedicated Auth Verification & Password Reset Test Suite...\n');

  // 1. Connect DB and start local server
  await connectDB();
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseURL = `http://localhost:${port}/api`;
  console.log(`   ✓ Test server listening on ${baseURL}\n`);

  try {
    const testEmail = `test_auth_${Date.now()}@example.com`;
    const initialPassword = 'InitialSecretPass123!';
    const newPassword = 'NewSecretPass456!';

    // TEST 1: Register new account (must NOT return token, must set isVerified: false)
    console.log('1. Testing User Registration...');
    const regRes = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification Candidate',
        email: testEmail,
        password: initialPassword
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regData.success, true);
    assert.strictEqual(regData.requireVerification, true);
    assert.strictEqual(regData.token, undefined, 'Registration must NOT return an active auth token');
    assert.strictEqual(regData.user.isVerified, false, 'User must start as unverified');
    console.log('   ✓ User registered with isVerified: false and no auth token issued.');

    // TEST 2: Attempt to login before email confirmation (MUST BE BLOCKED with HTTP 403)
    console.log('\n2. Testing Login Blocking for Unverified User...');
    const blockedLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword
      })
    });
    const blockedData = await blockedLoginRes.json();
    assert.strictEqual(blockedLoginRes.status, 403, 'Unconfirmed user must be rejected with 403 Forbidden');
    assert.strictEqual(blockedData.code, 'UNVERIFIED_EMAIL', 'Error code must be UNVERIFIED_EMAIL');
    assert.strictEqual(blockedData.token, undefined);
    console.log('   ✓ Login attempt before confirmation blocked with 403 UNVERIFIED_EMAIL.');

    // TEST 3: Resend Verification Email
    console.log('\n3. Testing Resend Verification Email...');
    const resendRes = await fetch(`${baseURL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const resendData = await resendRes.json();
    assert.strictEqual(resendData.success, true);
    console.log('   ✓ Resend verification endpoint succeeded.');

    // TEST 4: Confirm Email with valid token
    console.log('\n4. Testing Email Confirmation (/auth/verify-email)...');
    const rawToken = 'raw_verif_token_' + Date.now();
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await User.findOneAndUpdate(
      { email: testEmail },
      { verificationToken: hashedToken, verificationTokenExpire: Date.now() + 86400000 }
    );

    const verifyRes = await fetch(`${baseURL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken })
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyData.success, true);
    assert.ok(verifyData.token, 'Verify email must issue auth token upon confirmation');
    assert.strictEqual(verifyData.user.isVerified, true);
    console.log('   ✓ Email verified successfully! User isVerified is true and token issued.');

    // TEST 5: Login after email confirmation (MUST SUCCEED)
    console.log('\n5. Testing Login for Confirmed User...');
    const verifiedLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword
      })
    });
    const verifiedLoginData = await verifiedLoginRes.json();
    assert.strictEqual(verifiedLoginRes.status, 200);
    assert.strictEqual(verifiedLoginData.success, true);
    assert.ok(verifiedLoginData.token, 'Confirmed user must receive login JWT');
    console.log('   ✓ Login succeeded for verified user.');

    // TEST 6: Request Password Reset (/auth/forgot-password)
    console.log('\n6. Testing Forgot Password (/auth/forgot-password)...');
    const forgotRes = await fetch(`${baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const forgotData = await forgotRes.json();
    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(forgotData.success, true);
    console.log('   ✓ Password reset link generated and dispatched.');

    // TEST 7: Reset Password (/auth/reset-password)
    console.log('\n7. Testing Password Reset (/auth/reset-password)...');
    const resetRawToken = 'raw_reset_token_' + Date.now();
    const resetHashedToken = crypto.createHash('sha256').update(resetRawToken).digest('hex');
    await User.findOneAndUpdate(
      { email: testEmail },
      { resetPasswordToken: resetHashedToken, resetPasswordExpire: Date.now() + 3600000 }
    );

    const resetRes = await fetch(`${baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetRawToken,
        newPassword
      })
    });
    const resetData = await resetRes.json();
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetData.success, true);
    assert.ok(resetData.token, 'Reset password must issue active login token');
    console.log('   ✓ Password successfully reset to new password.');

    // TEST 8: Old password must be rejected
    console.log('\n8. Testing Login Rejection for Old Password...');
    const oldLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword
      })
    });
    assert.strictEqual(oldLoginRes.status, 401, 'Old password must be rejected');
    console.log('   ✓ Old password correctly rejected with 401.');

    // TEST 9: Login with new password must succeed
    console.log('\n9. Testing Login with New Password...');
    const newLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: newPassword
      })
    });
    const newLoginData = await newLoginRes.json();
    assert.strictEqual(newLoginRes.status, 200);
    assert.strictEqual(newLoginData.success, true);
    assert.ok(newLoginData.token);
    console.log('   ✓ Login with new password succeeded!');

    console.log('\n========================================================================');
    console.log('🎉 ALL 9 AUTH VERIFICATION & RESET PASSWORD TESTS PASSED 100%!');
    console.log('========================================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
};

runAuthVerificationSuite().catch(err => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
