const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
      code: 'FORBIDDEN_ADMIN_ONLY'
    });
  }
  next();
};

module.exports = { requireAdmin };
