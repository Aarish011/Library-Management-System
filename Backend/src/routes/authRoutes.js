const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const imageUpload = require('../middleware/upload');
const {
  validateRegister,
  validateLogin,
} = require('../validations/authValidation');

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/me', protect, authController.updateMe);
router.put('/me/password', protect, authController.changePassword);
router.post('/me/avatar', protect, imageUpload.single('profilePicture'), authController.uploadAvatar);

module.exports = router;
