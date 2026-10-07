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

// Function to dynamically validate allowed origins
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Allow non-browser requests (Postman, curl, server-to-server)

  const allowedList = [
    'https://hire-fitt.vercel.app',
    'https://hirefit.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : null
  ].filter(Boolean);

  if (allowedList.includes(origin)) return true;

  // Allow all Vercel deployments (production, previews, branch deploys)
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/i.test(origin)) return true;

  // Allow Render domains
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)*onrender\.com$/i.test(origin)) return true;

  // Allow localhost or 127.0.0.1 on any port
  if (/^http:\/\/localhost:\d+$/i.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/i.test(origin)) return true;

  return false;
};

// Explicit CORS Headers & Preflight Middleware (must be first, before routes & limiters)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }

  // Preflight requests return 200 immediately with headers
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    // Return null, false instead of throwing Error to prevent 500 status on preflights
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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
