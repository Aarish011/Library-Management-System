const { body } = require('express-validator');

exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),

  body('firebaseIdToken')
    .trim()
    .notEmpty()
    .withMessage('Please verify your phone number before registration'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender'),

  body('preparation')
    .notEmpty()
    .withMessage('Preparation is required')
    .isIn(['UPSC', 'JEE', 'GATE', 'NEET', 'CAT', 'Banking', 'SSC', 'Other'])
    .withMessage('Invalid preparation'),
];

exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email'),

  body('password').notEmpty().withMessage('Password is required'),
];
