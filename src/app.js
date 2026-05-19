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

// Trust Railway proxy (required for rate limiting & IP detection)
app.set('trust proxy', 1);

const { register } = require('./config/metrics');
const metricsMiddleware = require('./middleware/metricsMiddleware');

// ─────────────────────────────────────────────────────────────────────────────
// Metrics middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(metricsMiddleware);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─────────────────────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: [
    'https://devopschroniclesgit.github.io',
    'https://devopschronicles.com',
    'https://www.devopschronicles.com',
    'https://finpay.devopschronicles.com',
    'http://192.168.56.11:5173',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Request parsing
// ─────────────────────────────────────────────────────────────────────────────

// Prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─────────────────────────────────────────────────────────────────────────────
// HTTP logging
// ─────────────────────────────────────────────────────────────────────────────

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim(), { type: 'http' }),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/', apiLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// API routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/v1', routes);

// ─────────────────────────────────────────────────────────────────────────────
// Swagger Documentation
// ─────────────────────────────────────────────────────────────────────────────

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'FinPay API',
      version: '1.0.0',
      description: `
Production-style fintech payment API.

Inspired by the backend architecture of Stripe, PayFast, and Yoco.

## Features
- JWT Authentication
- Wallet Accounts
- Atomic Transfers
- Idempotency Keys
- Redis Rate Limiting
- Response Caching
- Audit Logs
- Prometheus Metrics
- Swagger API Documentation

## Demo Account

Email: alice@finpay.dev  
Password: SecurePass123

## Authentication Flow

1. Use \`POST /api/v1/auth/login\`
2. Copy the returned JWT token
3. Click the **Authorize** button
4. Paste:

\`\`\`
Bearer YOUR_TOKEN
\`\`\`

5. You can now access protected endpoints.
      `,
      contact: {
        name: 'FinPay API',
      },
    },

    servers: [
      {
        url: 'http://finpay-production.eba-n2emmkzf.eu-north-1.elasticbeanstalk.com',
        description: 'Production AWS',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Development',
      },
    ],

    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Transactions',
        description: 'Money transfers and transaction history',
      },
      {
        name: 'System',
        description: 'System monitoring and health endpoints',
      },
    ],

    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your JWT token here',
        },
      },
    },

    security: [
      {
        BearerAuth: [],
      },
    ],
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
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
    },

    customCss: `
      .swagger-ui .topbar {
        display: none;
      }

      .swagger-ui .info {
        margin-bottom: 20px;
      }

      .swagger-ui .scheme-container {
        border-radius: 8px;
      }
    `,
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Server React frontend (production only)
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, '..', 'client', 'dist');

// Debug — remove after fix
console.log('=== DEBUG ===');
console.log('__dirname:', __dirname);
console.log('distPath:', distPath);
console.log('distPath exists:', fs.existsSync(distPath));
try {
  console.log('/app contents:', fs.readdirSync('/app'));
  console.log('/app/client exists:', fs.existsSync('/app/client'));
  if (fs.existsSync('/app/client')) {
    console.log('/app/client contents:', fs.readdirSync('/app/client'));
  }
} catch(e) {
  console.log('readdir error:', e.message);
}
console.log('=== END DEBUG ===');

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// Must be LAST middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;
