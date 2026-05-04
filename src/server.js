const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const { disconnectDatabase } = require('./config/database');
const { disconnectRedis } = require('./config/redis');

const PORT = parseInt(process.env.PORT) || 3000;

// ── Start server ──────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  logger.info(`🚀 FinPay API started`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    docs: `http://localhost:${PORT}/api/docs`,
    health: `http://localhost:${PORT}/api/v1/health`,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
//
// On SIGTERM (Docker stop, Kubernetes pod eviction, Railway deploy):
//   1. Stop accepting new connections
//   2. Wait for in-flight requests to finish
//   3. Close database and Redis connections cleanly
//   4. Exit with code 0 (success)
//
// Without this, Docker kills the process mid-request and
// in-flight transactions can be left in PENDING state.

const shutdown = async (signal) => {
  logger.info(`${signal} received — starting graceful shutdown`);

  server.close(async () => {
    logger.info('HTTP server closed — no new connections accepted');

    try {
      await disconnectDatabase();
      await disconnectRedis();
      logger.info('All connections closed — exiting cleanly');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C in terminal

// Catch unhandled promise rejections — log and exit
// Continuing after an unhandled rejection is unsafe
process.on('unhandledRejection', (reason, promise) => {
  const message = reason?.message || String(reason);

  // Redis connection failures are non-fatal — server continues without cache
  if (message.includes('Connection is closed') || message.includes('Redis')) {
    logger.warn('Redis unhandled rejection — continuing without cache', { message });
    return;
  }

  logger.error('Unhandled promise rejection', { reason: message });
  process.exit(1);
});

module.exports = server;
