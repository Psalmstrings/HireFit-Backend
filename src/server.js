const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const { connectDB } = require('./config/db');
const initAdmin = require('./config/initAdmin');
const app = require('./app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await initAdmin();

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 HireFit Server is running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API Base: http://localhost:${PORT}/api`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Client: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log(`   Admin Login: psalmstringsdigital@gmail.com`);
    console.log(`   Gemini AI: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '⚠ Not configured'}`);
    console.log(`   Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configured' : '⚠ Not configured'}`);
    console.log(`   Gmail Nodemailer: ${process.env.EMAIL_PASS ? '✓ Live SMTP Active' : '⚠ Simulated mode'}\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    server.close(() => process.exit(1));
  });
};

startServer();
