require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./config/logger');

const app = express();
// Trust Railway's proxy — required for rate limiting and IP detection
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────────────────

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

// ── Request parsing ───────────────────────────────────────────────────────────

// Limit body size — prevents large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── HTTP request logging ──────────────────────────────────────────────────────

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim(), { type: 'http' }),
  },
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────

app.use('/api/', apiLimiter);

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api/v1', routes);

// ── Swagger documentation ─────────────────────────────────────────────────────

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FinPay API',
      version: '1.0.0',
      description: [
        'Production-style fintech payment API.',
        'Inspired by the backend architecture of Stripe, PayFast, and Yoco.',
        '',
        '**Features:** JWT auth · wallet accounts · atomic transfers · ',
        'idempotency keys · Redis rate limiting · response caching · audit logs',
      ].join('\n'),
      contact: {
        name: 'FinPay API',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your JWT token from /auth/login here',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'FinPay API Docs',
    swaggerOptions: {
      persistAuthorization: true, // keeps token across page refreshes
    },
  })
);

// ── 404 handler ───────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Must be last — Express identifies error handlers by their 4-argument signature

app.use(errorHandler);

module.exports = app;
