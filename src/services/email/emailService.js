const nodemailer = require('nodemailer');

const EMAIL_USER = (
  process.env.EMAIL_USER ||
  process.env.GMAIL_USER ||
  process.env.SMTP_USER ||
  'psalmstringsdigital@gmail.com'
).trim();

const rawPass = (
  process.env.EMAIL_PASS ||
  process.env.GMAIL_APP_PASSWORD ||
  process.env.EMAIL_PASSWORD ||
  process.env.SMTP_PASS ||
  'mxzs ogwv prrm fxpt'
).trim();

const EMAIL_PASS = rawPass.replace(/\s+/g, '');
const EMAIL_FROM = process.env.EMAIL_FROM || `"HireFit Team" <${EMAIL_USER}>`;

const DEFAULT_CLIENT_URL = (
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://hire-fitt.vercel.app' : 'http://localhost:5173')
).replace(/\/$/, '');

const resolveClientUrl = (reqOrigin) => {
  if (reqOrigin && typeof reqOrigin === 'string' && (reqOrigin.startsWith('http://') || reqOrigin.startsWith('https://'))) {
    return reqOrigin.replace(/\/$/, '');
  }
  return DEFAULT_CLIENT_URL;
};

// Base HTML Template wrapper using HireFit Official Brand Colors
// Primary: Deep navy #101C35 | Secondary: Electric blue #2878F0 | Accent: Mint #53E0B0 | Background: White #FFFFFF
const wrapHtmlEmail = ({ title, preheader, content, actionBtn, footerText }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFFFFF;
      font-family: 'Inter', 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #101C35;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F8FAFC;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      overflow: hidden;
      box-shadow: 0 4px 12px -2px rgba(16, 28, 53, 0.08);
    }
    .header {
      background: #101C35;
      padding: 30px 32px;
      text-align: center;
      border-bottom: 3px solid #53E0B0;
    }
    .brand-title {
      color: #FFFFFF;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 0;
    }
    .brand-accent {
      color: #2878F0;
    }
    .body-content {
      padding: 36px 32px;
      font-size: 15px;
      line-height: 1.65;
      color: #334155;
    }
    .greeting {
      font-size: 20px;
      font-weight: 800;
      color: #101C35;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background: #2878F0;
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 34px;
      text-decoration: none;
      border-radius: 8px;
      box-shadow: 0 3px 6px rgba(40, 120, 240, 0.25);
    }
    .highlight-box {
      background-color: #F0F4FA;
      border-left: 4px solid #53E0B0;
      border-radius: 6px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .url-fallback {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 14px 18px;
      border-radius: 6px;
      font-size: 12px;
      word-break: break-all;
      color: #64748B;
      margin-top: 24px;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      opacity: 0;
      color: transparent;
      height: 0;
      width: 0;
    }
  </style>
</head>
<body>
  <span class="preheader">${preheader || title}</span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Hire<span class="brand-accent">Fit</span></h1>
      </div>
      <div class="body-content">
        ${content}
        ${actionBtn ? `
          <div class="btn-container">
            <a href="${actionBtn.url}" target="_blank" class="btn">${actionBtn.text}</a>
          </div>
          <div class="url-fallback">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${actionBtn.url}" style="color: #2878F0; text-decoration: underline;">${actionBtn.url}</a>
          </div>
        ` : ''}
      </div>
      <div class="footer">
        ${footerText || `© ${new Date().getFullYear()} HireFit AI Platform. All rights reserved.`}
      </div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * 1. Resend HTTP API Delivery (PRIMARY: Free 3,000 emails/month, HTTPS Port 443 — immune to cloud host port blocking)
 */
const sendViaResend = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  try {
    const fromAddress = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'HireFit <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      })
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`📧 [EMAIL SENT via Resend HTTP API] Id: ${data.id} to ${to}`);
      return { success: true, provider: 'resend', messageId: data.id, to };
    }

    console.warn('⚠️ [Resend API Error]:', data);
    let errMsg = data.message || JSON.stringify(data);
    if (data.statusCode === 403 && data.message?.includes('testing emails')) {
      errMsg = 'Resend Sandbox mode: To send emails to users other than your Resend account email, please verify a domain at resend.com/domains and set RESEND_FROM in your environment variables.';
    }
    return { success: false, provider: 'resend', error: errMsg };
  } catch (err) {
    console.error('❌ [Resend Fetch Error]:', err.message);
    return { success: false, provider: 'resend', error: err.message };
  }
};

/**
 * 2. Nodemailer SMTP (Gmail or custom SMTP server fallback)
 */
const sendViaSmtp = async ({ to, subject, html, text }) => {
  if (!EMAIL_PASS || EMAIL_PASS === '') {
    return { success: false, provider: 'smtp', error: 'No SMTP password or API key configured' };
  }

  // A. Custom SMTP server if host specified
  if (process.env.SMTP_HOST) {
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    try {
      const customTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS
        },
        connectionTimeout: 12000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });

      const info = await customTransporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html
      });
      console.log(`📧 [EMAIL SENT via Custom SMTP] MessageId: ${info.messageId} to ${to}`);
      return { success: true, provider: 'smtp-custom', messageId: info.messageId, to };
    } catch (err) {
      console.error('❌ [Custom SMTP Error]:', err.message);
      return { success: false, provider: 'smtp-custom', error: err.message };
    }
  }

  // B. Gmail SMTP (Try SSL port 465 first; if timeout/blocked, attempt TLS port 587)
  const configs = [
    {
      name: 'Gmail SSL (465)',
      transport: {
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 8000,
        socketTimeout: 12000
      }
    },
    {
      name: 'Gmail TLS (587)',
      transport: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 8000,
        socketTimeout: 12000
      }
    }
  ];

  let lastError = null;

  for (const cfg of configs) {
    try {
      const transporter = nodemailer.createTransport(cfg.transport);
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html
      });
      console.log(`📧 [EMAIL SENT via ${cfg.name}] MessageId: ${info.messageId} to ${to}`);
      return { success: true, provider: cfg.name, messageId: info.messageId, to };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ [${cfg.name}] Failed: ${err.message}`);
      if (err.message && (err.message.includes('BadCredentials') || err.message.includes('Username and Password not accepted'))) {
        break;
      }
    }
  }

  const errMessage = lastError ? lastError.message : 'SMTP dispatch failed';
  console.error(`❌ [EMAIL ERROR] Failed to send email to ${to}:`, errMessage);

  if (lastError && (lastError.code === 'ETIMEDOUT' || errMessage.includes('timeout') || errMessage.includes('Greeting never received'))) {
    console.warn(`💡 [EMAIL ADVISORY] Render Free tier blocks outbound SMTP ports 25, 465, and 587. To send emails reliably in production without port blocking, set RESEND_API_KEY in Render Environment Variables.`);
  }

  return { success: false, provider: 'smtp', error: errMessage };
};

/**
 * Universal SendMail Function with Resend as Primary Driver
 */
const sendMail = async ({ to, subject, html, text }) => {
  // 1. Resend HTTP API (Primary: Free 3,000 emails/mo, HTTPS Port 443 — immune to cloud host port blocking)
  const resendResult = await sendViaResend({ to, subject, html, text });
  if (resendResult && resendResult.success) {
    return resendResult;
  }

  // 2. Direct SMTP fallback (Gmail or custom SMTP)
  const smtpResult = await sendViaSmtp({ to, subject, html, text });
  if (smtpResult.success) {
    return smtpResult;
  }

  // If both failed:
  const finalError = resendResult?.error || smtpResult?.error || 'All email delivery drivers failed';
  console.error(`❌ All email delivery providers failed for ${to}. Error: ${finalError}`);
  return {
    success: false,
    error: finalError,
    to,
    subject
  };
};

/**
 * 1. Verification Email after user registration
 */
const sendVerificationEmail = async ({ email, name, token, clientUrl }) => {
  const baseUrl = resolveClientUrl(clientUrl);
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  const subject = 'Verify your HireFit Account';
  const preheader = 'Please confirm your email address to activate your HireFit account.';

  const content = `
    <h2 class="greeting">Hi ${name || 'there'}, welcome to HireFit!</h2>
    <p>Thank you for creating an account with HireFit. To activate your account and start tailoring your CV with verified, genuine experience, please verify your email address.</p>
    <div class="highlight-box">
      <span style="font-size: 13px; color: #101C35; font-weight: 600;">🔒 Security Notice:</span>
      <p style="margin: 4px 0 0; font-size: 13px; color: #475569;">This verification link will expire in 24 hours.</p>
    </div>
  `;

  const html = wrapHtmlEmail({
    title: subject,
    preheader,
    content,
    actionBtn: {
      text: 'Verify My Account',
      url: verifyUrl
    },
    footerText: `If you didn't create a HireFit account, you can safely ignore this email.<br>© ${new Date().getFullYear()} HireFit Platform.`
  });

  const text = `Hi ${name || 'there'},\n\nWelcome to HireFit! Please verify your email address by visiting the link below:\n${verifyUrl}\n\nThis link will expire in 24 hours.`;

  return await sendMail({ to: email, subject, html, text });
};

/**
 * 2. Welcome Email sent when a user successfully verifies their account
 */
const sendWelcomeEmail = async ({ email, name, clientUrl }) => {
  const baseUrl = resolveClientUrl(clientUrl);
  const dashboardUrl = `${baseUrl}/dashboard`;
  const subject = 'Welcome to HireFit! 🎉 Your account is verified';
  const preheader = 'Your HireFit account is now verified and ready to optimize your job applications.';

  const content = `
    <h2 class="greeting">Congratulations, ${name || 'Friend'}!</h2>
    <p>Your email has been successfully verified, and your HireFit account is now active!</p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 24px 0; border-top: 3px solid #53E0B0;">
      <h3 style="margin-top: 0; font-size: 16px; color: #101C35;">Get Started in 3 Simple Steps:</h3>
      <ol style="margin-bottom: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li style="margin-bottom: 8px;"><strong>Upload Your Master CV:</strong> Upload your PDF or Word resume to extract skills and work history.</li>
        <li style="margin-bottom: 8px;"><strong>Analyze a Target Job:</strong> Paste any job posting to see an evidence-based match score and skill gaps.</li>
        <li><strong>Generate Job-Tailored CVs:</strong> Use zero-fabrication AI optimization to highlight relevant achievements.</li>
      </ol>
    </div>

    <p>Ready to stand out to employers and pass ATS screenings with confidence?</p>
  `;

  const html = wrapHtmlEmail({
    title: subject,
    preheader,
    content,
    actionBtn: {
      text: 'Go to Your Dashboard',
      url: dashboardUrl
    },
    footerText: `We're excited to have you on board!<br>© ${new Date().getFullYear()} HireFit Career Platform.`
  });

  const text = `Congratulations ${name || 'there'}!\n\nYour email has been verified and your HireFit account is active.\n\nVisit your dashboard to start optimizing your CV:\n${dashboardUrl}`;

  return await sendMail({ to: email, subject, html, text });
};

/**
 * 3. Password Reset Email
 */
const sendPasswordResetEmail = async ({ email, name, token, clientUrl }) => {
  const baseUrl = resolveClientUrl(clientUrl);
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const subject = 'Reset your HireFit Password';
  const preheader = 'Instructions to reset your HireFit password.';

  const content = `
    <h2 class="greeting">Hello ${name || 'there'},</h2>
    <p>We received a request to reset the password for your HireFit account.</p>
    <div class="highlight-box">
      <p style="margin: 0; font-size: 13px; color: #101C35;">For security purposes, this password reset link will expire in <strong>1 hour</strong>.</p>
    </div>
  `;

  const html = wrapHtmlEmail({
    title: subject,
    preheader,
    content,
    actionBtn: {
      text: 'Reset My Password',
      url: resetUrl
    },
    footerText: `If you didn't request a password reset, please ignore this email or contact support if you suspect unauthorized activity.<br>© ${new Date().getFullYear()} HireFit Platform.`
  });

  const text = `Hello ${name || 'there'},\n\nWe received a request to reset your password. Use the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour.`;

  return await sendMail({ to: email, subject, html, text });
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMail
};
