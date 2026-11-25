const User = require('../models/User');

const initAdmin = async () => {
  try {
    // Remove old mock accounts
    await User.deleteMany({
      email: { $in: ['demo@hirefit.dev', 'admin@hirefit.dev'] }
    });

    const adminPass = process.env.ADMIN_PASSWORD || 'AdminHireFit@1';
    const adminAccounts = [
      { email: 'psalmstringsdigital@gmail.com', pass: adminPass },
      { email: 'psalmtringsdigital@gmail.com', pass: adminPass }
    ];

    for (const acc of adminAccounts) {
      let admin = await User.findOne({ email: acc.email }).select('+password');

      if (!admin) {
        await User.create({
          name: 'HireFit Administrator',
          email: acc.email,
          password: acc.pass,
          role: 'admin',
          isVerified: true
        });
        console.log(`[Admin Init] ✓ Admin account created successfully (${acc.email})`);
      } else {
        let modified = false;
        if (admin.role !== 'admin') {
          admin.role = 'admin';
          modified = true;
        }
        if (!admin.isVerified) {
          admin.isVerified = true;
          modified = true;
        }
        const isMatch = await admin.matchPassword(acc.pass);
        if (!isMatch) {
          admin.password = acc.pass;
          modified = true;
        }
        if (modified) {
          await admin.save();
          console.log(`[Admin Init] ✓ Admin account verified and updated (${acc.email})`);
        }
      }
    }
  } catch (err) {
    console.error('[Admin Init] Error initializing admin:', err.message);
  }
};

module.exports = initAdmin;
