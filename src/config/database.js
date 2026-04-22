const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

// Route Prisma logs through Winston so everything is in one place
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Prisma query', {
      query: e.query,
      duration: `${e.duration}ms`,
    });
  });
}

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning', { message: e.message });
});

prisma.$on('error', (e) => {
  logger.error('Prisma error', { message: e.message });
});

// Graceful shutdown helper
const disconnectDatabase = async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected gracefully');
};

module.exports = prisma;
module.exports.disconnectDatabase = disconnectDatabase;
