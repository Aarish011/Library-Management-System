const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { validationResult } = require('express-validator');
const { uploadBuffer } = require('../config/cloudinary');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');
const { verifyFirebaseIdToken } = require('../services/firebaseAdminService');

function buildArchivedEmail(user) {
  const email = String(user.email || '').trim().toLowerCase();
  if (email.startsWith(`archived-${user._id}-`)) return email;
  return `archived-${user._id}-${email}`;
}

function buildArchivedPhone(user) {
  const digits = String(user._id || '').replace(/\D/g, '');
  return digits.padEnd(10, '0').slice(-10);
}

async function releaseArchivedUserIdentity(user) {
  if (!user?.isArchived) return false;

  user.email = buildArchivedEmail(user);
  user.phone = buildArchivedPhone(user);
  user.isActive = false;
  await user.save({ validateBeforeSave: false });
  return true;
}

// Register
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      phone,
      password,
      gender,
      preparation,
      firebaseIdToken,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile photo is required',
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
    } catch (firebaseError) {
      console.error('Register phone verification error:', firebaseError);
      const reason = getFirebaseVerificationMessage(firebaseError);
      return res.status(400).json({
        success: false,
        message: reason,
      });
    }

    const verifiedPhone = normalizeIndianPhone(decodedToken.phone_number);

    if (!verifiedPhone || verifiedPhone !== normalizeIndianPhone(phone)) {
      return res.status(403).json({
        success: false,
        message: 'Please verify this phone number before registration',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const releasedArchivedUser = await releaseArchivedUserIdentity(existingUser);
      if (releasedArchivedUser) {
        console.log(`Released archived user email for registration: ${email}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      const releasedArchivedUser = await releaseArchivedUserIdentity(existingPhone);
      if (releasedArchivedUser) {
        console.log(`Released archived user phone for registration: ${phone}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered',
        });
      }
    }

    const uploadResult = await uploadBuffer(
      req.file,
      'library-management/profile-images'
    );

    const user = await User.create({
      name,
      email,
      phone,
      password,
      gender,
      preparation,
      profilePicture: uploadResult.secure_url,
      role: 'student',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact the library admin.',
      });
    }

    await user.updateOne({ lastLogin: new Date() });

    const token = generateToken(user._id);
    const safeUser = await User.findById(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, token },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
    });
  }
};

// Student profile fields are admin-managed after registration.
exports.updateMe = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Profile details can only be changed by the library admin.',
  });
};

// Change current user's password
exports.uploadAvatar = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Profile photo can only be changed by the library admin.',
  });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const publicMessage =
      'If an account exists for this email, a password reset link has been sent.';

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ email }).select(
      '+passwordResetToken +passwordResetExpires'
    );

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl,
        });
      } catch (deliveryError) {
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save({ validateBeforeSave: false });
        console.error('Password reset delivery error:', {
          code: deliveryError.code,
          command: deliveryError.command,
          responseCode: deliveryError.responseCode,
          message: deliveryError.message,
        });
        const isEmailConfigError = /email service is not configured/i.test(
          deliveryError.message || ''
        );
        return res.status(500).json({
          success: false,
          message: isEmailConfigError
            ? 'Password reset email is not configured yet. Please contact the library desk.'
            : 'Could not send the reset email right now. Please try again later.',
        });
      }
    }

    res.json({
      success: true,
      message: publicMessage,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset link',
    });
  }
};

function normalizeIndianPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  return digits;
}

function getFirebaseVerificationMessage(error) {
  const code = error?.code || '';

  if (code.includes('id-token-expired')) {
    return 'Phone verification expired. Please request a new OTP and verify again.';
  }

  if (code.includes('argument-error') || code.includes('invalid')) {
    return 'Phone verification token is invalid. Please verify your phone number again.';
  }

  if (process.env.NODE_ENV !== 'production' && code) {
    return `Phone verification failed (${code}). Please verify your phone number again.`;
  }

  return 'Phone verification failed. Please verify your phone number again.';
}

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password +passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired',
      });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
};
