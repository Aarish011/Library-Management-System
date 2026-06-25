const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const seedAdmin = require('./utils/seedAdmin');

dotenv.config();

const runSeed = async () => {
  try {
    await connectDB();
    await seedAdmin();
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

runSeed();
