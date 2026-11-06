require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

const { connectDB, disconnectDB } = require('./config/db');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');
const { ensureSeedData } = require('./services/seedService');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

/* ------------------------------- Environment ------------------------------ */
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is required in production.');
    process.exit(1);
  }
  process.env.JWT_SECRET = require('crypto').randomBytes(48).toString('hex');
  console.warn('[config] JWT_SECRET was not set. Using an ephemeral development secret.');
}

/* --------------------------------- Security -------------------------------- */
app.disable('x-powered-by');

const allowedOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl / mobile apps
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (
        process.env.NODE_ENV !== 'production' &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use('/api', apiLimiter, apiRoutes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'MediCare AI – Smart Medical Assistant API',
    health: '/api/health',
  });
});

/* --------------------------- Optional SPA hosting -------------------------- */
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
}

app.use(notFound);
app.use(errorHandler);

/* --------------------------------- Startup -------------------------------- */
let server;

const startServer = async () => {
  try {
    await connectDB();

    if (process.env.SEED_ON_START !== 'false') {
      const result = await ensureSeedData();
      if (!result.skipped) {
        console.log('[seed] Demo accounts are ready:');
        console.log('  Patient: patient@medicare.ai / Patient@123');
        console.log('  Doctor:  dr.arjun@medicare.ai / Doctor@123');
        console.log('  Admin:   admin@medicare.ai / Admin@123');
      }
    }

    server = app.listen(PORT, () => {
      console.log(`\n[server] MediCare AI API running on http://localhost:${PORT}`);
      console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[server] Allowed client origin(s): ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('[server] Failed to start:', error.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n[server] ${signal} received. Shutting down gracefully...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

startServer();

module.exports = app;
l̥