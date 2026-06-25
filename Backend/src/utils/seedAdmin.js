const User = require('../models/User');

const getEnvValue = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return null;
};

const seedAdmin = async () => {
  const email = getEnvValue('adminEmail', 'ADMIN_EMAIL');
  const password = getEnvValue('adminPassword', 'ADMIN_PASSWORD');

  if (!email || !password) {
    throw new Error('adminEmail and adminPassword must be set in Backend/.env');
  }

  const normalizedEmail = email.toLowerCase();
  const existingAdmin = await User.findOne({ email: normalizedEmail }).select('+password');

  if (existingAdmin) {
    existingAdmin.password = password;
    existingAdmin.role = 'admin';
    existingAdmin.isActive = true;
    await existingAdmin.save();

    console.log(`Admin user updated: ${normalizedEmail}`);
    return existingAdmin;
  }

  const admin = await User.create({
    name: getEnvValue('adminName', 'ADMIN_NAME') || 'Library Admin',
    email: normalizedEmail,
    phone: getEnvValue('adminPhone', 'ADMIN_PHONE') || '9999999999',
    password,
    gender: getEnvValue('adminGender', 'ADMIN_GENDER') || 'other',
    preparation: getEnvValue('adminPreparation', 'ADMIN_PREPARATION') || 'Other',
    role: 'admin',
    isActive: true,
  });

  console.log(`Admin user created: ${normalizedEmail}`);
  return admin;
};

module.exports = seedAdmin;
