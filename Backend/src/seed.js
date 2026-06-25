const dotenv = require('dotenv');
const connectDB = require('./config/database');
const seedSeats = require('./utils/seedData');


dotenv.config();

const runSeed = async () => {
  try {
    await connectDB();

    await seedSeats();

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runSeed();
