const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default Node.js metrics (memory, CPU, event loop etc.)
client.collectDefaultMetrics({ register });

// Custom metric — HTTP request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Custom metric — HTTP request counter
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Custom metric — Active transactions
const activeTransactions = new client.Gauge({
  name: 'finpay_active_transactions',
  help: 'Number of transactions currently being processed',
  registers: [register],
});

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  activeTransactions,
};
