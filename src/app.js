require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

require('./config/cloudinary');

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const cvRoutes = require('./routes/cvRoutes');
const jobRoutes = require('./routes/jobRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const coverLetterRoutes = require('./routes/coverLetterRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Dynamic CORS to permit any localhost/127.0.0.1 development port and configured CLIENT_URL
const allowedOrigins = [
  'https://hire-fitt.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsers with size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve local uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check (public, before rate limiter & auth)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'HireFit API is running.',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Apply general rate limiter to API routes
app.use('/api', apiLimiter);

// Route mounts
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // /api/users/me handled by auth routes
app.use('/api/cvs', cvRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/cover-letters', coverLetterRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
    code: 'NOT_FOUND'
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
