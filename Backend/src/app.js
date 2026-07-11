const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const seedAdmin = require('./utils/seedAdmin');
const { getEmailConfigStatus } = require('./services/emailService');

dotenv.config();

// Connect to MongoDB
connectDB().then(async () => {
  const hasAdminCredentials =
    (process.env.adminEmail || process.env.ADMIN_EMAIL) &&
    (process.env.adminPassword || process.env.ADMIN_PASSWORD);

  if (!hasAdminCredentials) return;

  try {
    await seedAdmin();
  } catch (error) {
    console.error(`Admin sync failed: ${error.message}`);
  }
});

const app = express();
const emailConfigStatus = getEmailConfigStatus();

if (!emailConfigStatus.configured) {
  console.warn('Email service is not fully configured:', {
    hasHost: emailConfigStatus.hasHost,
    hasUser: emailConfigStatus.hasUser,
    hasPassword: emailConfigStatus.hasPassword,
  });
}

function parseAllowedOrigins() {
  return [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    process.env.CLIENT_URL,
    process.env.CORS_ORIGIN,
    process.env.CORS_ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();
const localNetworkOriginPattern =
  /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):(5173|5174)$/;

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalizedOrigin)) return true;
  if (
    process.env.NODE_ENV === 'production' &&
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin)
  ) {
    return true;
  }
  return (
    process.env.NODE_ENV !== 'production' &&
    localNetworkOriginPattern.test(normalizedOrigin)
  );
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());
app.use(hpp());

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
const authRoutes = require('./routes/authRoutes');
const seatRoutes = require('./routes/seatRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const issueRoutes = require('./routes/issueRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
