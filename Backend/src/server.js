const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const dotenv = require('dotenv');
const cleanupJob = require('./jobs/cleanupReservations');
const subscriptionLifecycleJob = require('./jobs/checkSubscriptions');

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

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

const defaultProductionOrigins = [
  'https://library.genzcollege.com',
  'https://www.library.genzcollege.com',
];

const allowedSocketOrigins = Array.from(
  new Set([...parseAllowedOrigins(), ...defaultProductionOrigins])
);
const vercelOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
const genzCollegeOriginPattern = /^https:\/\/([a-z0-9-]+\.)?genzcollege\.com$/i;

function isAllowedSocketOrigin(origin) {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  if (allowedSocketOrigins.includes(normalizedOrigin)) return true;
  return (
    process.env.NODE_ENV === 'production' &&
    (vercelOriginPattern.test(normalizedOrigin) ||
      genzCollegeOriginPattern.test(normalizedOrigin))
  );
}

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedSocketOrigin(origin)) {
        callback(null, true);
        return;
      }
      console.warn('Socket CORS blocked origin:', origin);
      callback(new Error('Not allowed by Socket CORS'));
    },
    credentials: true,
  },
});

// Store io instance
app.set('io', io);
global.io = io;

// Socket handlers
require('./sockets')(io);

// Start cron jobs
// Run cleanup every 5 minutes
cron.schedule('*/5 * * * *', cleanupJob);
cron.schedule('* * * * *', async () => {
  try {
    const result = await subscriptionLifecycleJob();
    if (
      result.remindersCreated ||
      result.subscriptionsExpired ||
      result.seatsReleased
    ) {
      console.log('Subscription lifecycle processed:', result);
    }
  } catch (error) {
    console.error('Subscription lifecycle job failed:', error);
  }
});

subscriptionLifecycleJob().catch((error) => {
  console.error('Initial subscription lifecycle check failed:', error);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`⏰ Cleanup job scheduled every 5 minutes`);
  console.log('Subscription lifecycle scheduled every minute');
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
