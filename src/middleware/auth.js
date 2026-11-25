const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Token missing.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'hirefit_super_secret_jwt_key_2026_production_grade_token'
    );
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Block unverified users from accessing protected endpoints
    if (!user.isVerified && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address to access your account.',
        code: 'UNVERIFIED_EMAIL'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Invalid or expired token.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
};

module.exports = { protect };
