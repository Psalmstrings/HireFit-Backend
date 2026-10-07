const errorHandler = (err, req, res, next) => {
  console.error(`[Error ${err.code || 'UNHANDLED'}]:`, err.message || err);

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal server error occurred.';
  let code = err.code || 'SERVER_ERROR';

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the 10MB limit. Please upload a smaller document.';
      code = 'FILE_TOO_LARGE';
    } else {
      message = `Upload error: ${err.message}`;
      code = 'UPLOAD_ERROR';
    }
  }

  // Handle file validation error
  if (err.code === 'INVALID_FILE_TYPE') {
    statusCode = 400;
    message = err.message;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with specified ID (${err.value}).`;
    code = 'INVALID_RESOURCE_ID';
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with this ${field} already exists.`;
    code = 'DUPLICATE_KEY_ERROR';
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
    code = 'VALIDATION_ERROR';
  }

  // Handle JSON Web Token errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
    code = 'AUTH_TOKEN_INVALID';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please log in again.';
    code = 'AUTH_TOKEN_EXPIRED';
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
};

module.exports = errorHandler;
