const {
  cleanupExpiredReservations,
} = require('../controllers/reservationController');
const { releaseOrphanedSeatLocks } = require('../services/seatConsistencyService');

const cleanupJob = async () => {
  try {
    const result = await cleanupExpiredReservations();
    const releasedOrphans = await releaseOrphanedSeatLocks();

    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired reservations`);
    }

    if (result.failedPayments > 0) {
      console.log(`Marked ${result.failedPayments} pending payments as failed`);
    }

    if (releasedOrphans > 0) {
      console.log(`Released ${releasedOrphans} orphaned seat locks`);
    }
  } catch (error) {
    console.error('Cleanup job failed:', error);
  }
};

module.exports = cleanupJob;
