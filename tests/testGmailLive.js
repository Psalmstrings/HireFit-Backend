require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
} = require('../src/services/email/emailService');

const testGmail = async () => {
  console.log('📬 Initializing Live Gmail SMTP Diagnostics...\n');

  const user = (process.env.EMAIL_USER || 'psalmtringsdigital@gmail.com').trim();
  const rawPass = process.env.EMAIL_PASS || '';
  const pass = rawPass.trim().replace(/\s+/g, '');

  console.log(`   User: ${user}`);
  console.log(`   Pass configured: ${pass ? 'Yes (' + pass.length + ' chars)' : 'No'}`);

  if (!pass) {
    console.error('❌ EMAIL_PASS is not configured in server/.env');
    process.exit(1);
  }

  // 1. Direct transporter verification
  console.log('\n1. Verifying SMTP Connection with Google Mail Server (smtp.gmail.com)...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });

  try {
    await transporter.verify();
    console.log('   ✓ Gmail SMTP authentication verified successfully!');
  } catch (verifyErr) {
    console.error('❌ Gmail SMTP authentication failed:', verifyErr.message);
    process.exit(1);
  }

  // 2. Send live verification email to psalmtringsdigital@gmail.com
  console.log(`\n2. Sending Live Test Email to ${user}...`);
  try {
    const result = await sendVerificationEmail({
      email: user,
      name: 'HireFit Administrator',
      token: 'live_test_' + Math.random().toString(36).substring(2, 10)
    });

    if (result.success) {
      console.log(`   ✓ Live email delivered successfully! Message ID: ${result.messageId}`);
    } else {
      console.error('   ❌ Delivery returned failure:', result.error);
      process.exit(1);
    }
  } catch (sendErr) {
    console.error('❌ Error sending live email:', sendErr.message);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 GMAIL NODEMAILER SERVICE IS 100% OPERATIONAL & LIVE!');
  console.log('======================================================\n');
  process.exit(0);
};

testGmail();
