require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sendVerificationEmail } = require('../src/services/email/emailService');

const testResend = async () => {
  console.log('📬 Initializing Resend Email Diagnostics...\n');

  const apiKey = process.env.RESEND_API_KEY;
  console.log(`   RESEND_API_KEY present: ${apiKey ? 'Yes (' + apiKey.substring(0, 6) + '...)' : 'No'}`);

  if (!apiKey) {
    console.log('\n💡 Notice: RESEND_API_KEY is not configured in server/.env yet.');
    console.log('   1. Sign up for free at https://resend.com');
    console.log('   2. Create an API key at https://resend.com/api-keys');
    console.log('   3. Add RESEND_API_KEY=re_... in server/.env and in your Render Dashboard.');
    console.log('   4. Fallback SMTP (Gmail) will be used when RESEND_API_KEY is absent.\n');
    process.exit(0);
  }

  const testRecipient = process.argv[2] || process.env.EMAIL_USER || 'psalmstringsdigital@gmail.com';
  console.log(`   Sending test verification email to: ${testRecipient}...`);

  const result = await sendVerificationEmail({
    email: testRecipient,
    name: 'HireFit Test User',
    token: 'test_token_' + Date.now()
  });

  if (result.success) {
    console.log(`\n🎉 Success! Email delivered via Resend. Message ID: ${result.messageId}`);
  } else {
    console.error(`\n❌ Resend dispatch failed: ${result.error}`);
  }
};

testResend();
