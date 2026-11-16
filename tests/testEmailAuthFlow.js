const assert = require('assert');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
} = require('../src/services/email/emailService');

const runEmailAuthTests = async () => {
  console.log('📧 Testing Email Verification & Nodemailer Integration Flow...');

  // 1. Test Email Service functions directly
  const vResult = await sendVerificationEmail({
    email: 'test@example.com',
    name: 'Test Candidate',
    token: 'abcd1234efgh5678'
  });
  assert.strictEqual(vResult.success, true);
  console.log('   ✓ Verification email template generated and dispatched.');

  const wResult = await sendWelcomeEmail({
    email: 'test@example.com',
    name: 'Test Candidate'
  });
  assert.strictEqual(wResult.success, true);
  console.log('   ✓ Welcome email template generated and dispatched.');

  const pResult = await sendPasswordResetEmail({
    email: 'test@example.com',
    name: 'Test Candidate',
    token: 'reset9876token'
  });
  assert.strictEqual(pResult.success, true);
  console.log('   ✓ Password reset email template generated and dispatched.');

  // 2. Test User Model Verification Fields
  await connectDB();
  const testEmail = `verify_test_${Date.now()}@example.com`;
  const user = await User.create({
    name: 'Verify Tester',
    email: testEmail,
    password: 'Password123!',
    isVerified: false,
    verificationToken: 'hash123456',
    verificationTokenExpire: Date.now() + 86400000
  });

  assert.strictEqual(user.isVerified, false);
  assert.ok(user.verificationToken);

  // Mark verified
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  const refreshed = await User.findById(user._id);
  assert.strictEqual(refreshed.isVerified, true);
  assert.strictEqual(refreshed.verificationToken, undefined);
  console.log('   ✓ User verification model logic verified.');

  await User.deleteOne({ _id: user._id });
  await disconnectDB();

  console.log('\n🎉 Email & Verification tests passed 100%!\n');
};

runEmailAuthTests().catch(err => {
  console.error('Email auth test failed:', err);
  process.exit(1);
});
