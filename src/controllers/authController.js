const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMail
} = require('../services/email/emailService');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'hirefit_super_secret_jwt_key_2026_production_grade_token',
    { expiresIn: '30d' }
  );
};

// @desc Register new user
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
        code: 'MISSING_FIELDS'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
        code: 'WEAK_PASSWORD'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Generate email verification token (unhashed sent in email, hashed stored in DB)
    const verificationRawToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationRawToken).digest('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'user',
      isVerified: false,
      verificationToken: verificationTokenHash,
      verificationTokenExpire,
      lastLogin: new Date()
    });

    // Dispatch verification email via live email provider
    const emailResult = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verificationRawToken,
      clientUrl: req.headers.origin
    });

    // DO NOT return a JWT token: users MUST verify email before gaining access
    res.status(201).json({
      success: true,
      message: emailResult.success
        ? 'Account registered successfully! A confirmation link has been sent to your email. Please check your inbox and verify your email to log in.'
        : 'Account created! However, we experienced a delay delivering the confirmation email. Please click "Resend Verification Email" or check your inbox shortly.',
      requireVerification: true,
      emailSent: Boolean(emailResult.success),
      emailError: emailResult.success ? undefined : emailResult.error,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: false
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Verify email address
// @route POST /api/auth/verify-email
// @route GET /api/auth/verify-email
const verifyEmail = async (req, res, next) => {
  try {
    const rawToken = req.query.token || req.body.token;

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
        code: 'MISSING_TOKEN'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired. Please request a new one.',
        code: 'INVALID_OR_EXPIRED_TOKEN'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    // Dispatch Welcome Email asynchronously
    sendWelcomeEmail({
      email: user.email,
      name: user.name,
      clientUrl: req.headers.origin
    }).catch(welcomeErr => {
      console.error('Failed to send welcome email:', welcomeErr.message);
    });

    // Once email is successfully verified, issue token for immediate login
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email successfully verified! Welcome to HireFit.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Resend verification email
// @route POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
        code: 'MISSING_EMAIL'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email address is registered, a new verification link has been sent.'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This account has already been verified. You can log in directly.',
        code: 'ALREADY_VERIFIED'
      });
    }

    const verificationRawToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = crypto.createHash('sha256').update(verificationRawToken).digest('hex');
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const emailResult = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verificationRawToken,
      clientUrl: req.headers.origin
    });

    if (!emailResult.success) {
      return res.status(502).json({
        success: false,
        message: `Failed to deliver verification email: ${emailResult.error || 'Email delivery failed'}. Please check your SMTP/Email settings.`,
        code: 'EMAIL_SEND_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'A fresh verification email has been sent to your inbox. Please check your spam folder if you do not see it.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc Login user
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // REQUIREMENT: Users should not be able to access login until email has been confirmed
    if (!user.isVerified && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your inbox for the confirmation link.',
        code: 'UNVERIFIED_EMAIL',
        email: user.email
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get current authenticated user
// @route GET /api/users/me or GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
        aiUsageCount: user.aiUsageCount || 0,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Forgot password
// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
        code: 'MISSING_EMAIL'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Return 200 generic message to prevent email enumeration
      return res.json({
        success: true,
        message: 'If that email address is registered, password reset instructions have been sent.'
      });
    }

    const resetRawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetRawToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const emailResult = await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token: resetRawToken,
      clientUrl: req.headers.origin
    });

    if (!emailResult.success) {
      return res.status(502).json({
        success: false,
        message: `Failed to send password reset email: ${emailResult.error || 'Mail delivery error'}. Please try again later.`,
        code: 'EMAIL_SEND_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Password reset link has been sent to your email.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc Reset password
// @route POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Password must be at least 6 characters.',
        code: 'INVALID_RESET_DATA'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    // Successfully resetting password via authenticated email link confirms ownership!
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successfully! You are now logged in.',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Diagnostic endpoint to test live email delivery in production
// @route POST /api/auth/diagnostic/test-email
const testEmailDiagnostic = async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || process.env.EMAIL_USER || 'psalmstringsdigital@gmail.com';

    const result = await sendMail({
      to: targetEmail,
      subject: 'HireFit Email Diagnostics Test',
      html: '<p>This is a diagnostic test email from the HireFit API.</p>',
      text: 'This is a diagnostic test email from the HireFit API.'
    });

    res.json({
      success: result.success,
      result,
      targetEmail
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  testEmailDiagnostic
};
