require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Purging legacy seed accounts...');
    await User.deleteMany({
      email: { $in: ['demo@hirefit.dev', 'admin@hirefit.dev'] }
    });

    const adminAccounts = [
      { email: 'psalmstringsdigital@gmail.com', pass: 'psalmstringsdigital@gmail.com' },
      { email: 'psalmtringsdigital@gmail.com', pass: 'psalmtringsdigital@gmail.com' }
    ];

    for (const acc of adminAccounts) {
      let admin = await User.findOne({ email: acc.email });
      if (!admin) {
        await User.create({
          name: 'HireFit Administrator',
          email: acc.email,
          password: acc.pass,
          role: 'admin',
          isVerified: true
        });
      } else {
        admin.role = 'admin';
        admin.isVerified = true;
        admin.password = acc.pass;
        await admin.save();
      }
      console.log(`✅ Production Admin Ready: ${acc.email}`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Database setup failed:', err.message);
    await disconnectDB();
    process.exit(1);
  }
};

seedDatabase();
