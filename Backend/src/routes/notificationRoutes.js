const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, notificationController.getNotifications);
router.get('/unread-count', protect, notificationController.getUnreadCount);
router.put('/read-all', protect, notificationController.markAllAsRead);
router.get('/:notificationId', protect, notificationController.getNotificationById);
router.put('/:notificationId/read', protect, notificationController.markAsRead);
router.delete('/:notificationId', protect, notificationController.deleteNotification);

module.exports = router;
