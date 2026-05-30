const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  // Always log the full error internally
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || 'unauthenticated',
    ip: req.ip,
  });

  // ── Prisma error mapping ──────────────────────────────────────────────────

  // Unique constraint violation (e.g. duplicate email)
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: `A record with this ${err.meta?.target?.[0] || 'value'} already exists.`,
      timestamp: new Date().toISOString(),
    });
  }

  // Record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
      timestamp: new Date().toISOString(),
    });
  }

  // Foreign key constraint failed
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Related record does not exist.',
      timestamp: new Date().toISOString(),
    });
  }

  // ── JWT errors ────────────────────────────────────────────────────────────

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired.',
      timestamp: new Date().toISOString(),
    });
  }

  // ── Validation errors ─────────────────────────────────────────────────────

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Default ───────────────────────────────────────────────────────────────

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'Internal server error'   // never leak internal details in production
    : err.message;

  return res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
