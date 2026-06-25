const {
  cleanupExpiredReservations,
} = require('../controllers/reservationController');

const cleanupJob = async () => {
  try {
    const result = await cleanupExpiredReservations();
    if (result.count > 0) {
      console.log(`✅ Cleaned up ${result.count} expired reservations`);
    }
  } catch (error) {
    console.error('❌ Cleanup job failed:', error);
  }
};

module.exports = cleanupJob;
