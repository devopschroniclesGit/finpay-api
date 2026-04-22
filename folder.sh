#!/bin/bash
# Source directories
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/middleware
mkdir -p src/routes
mkdir -p src/services
mkdir -p src/utils
mkdir -p src/validators

# Database
mkdir -p prisma

# Logs directory (gitignored, but needs to exist)
mkdir -p logs

# Entry points
touch src/app.js
touch src/server.js

# Config files
touch src/config/database.js
touch src/config/redis.js
touch src/config/logger.js

# Utils
touch src/utils/response.js
touch src/utils/asyncHandler.js

# Middleware
touch src/middleware/auth.js
touch src/middleware/rateLimiter.js
touch src/middleware/idempotency.js
touch src/middleware/cache.js
touch src/middleware/auditLogger.js
touch src/middleware/errorHandler.js

# Controllers
touch src/controllers/auth.controller.js
touch src/controllers/account.controller.js
touch src/controllers/transaction.controller.js

# Routes
touch src/routes/index.js
touch src/routes/auth.routes.js
touch src/routes/account.routes.js
touch src/routes/transaction.routes.js

# Services
touch src/services/auth.service.js
touch src/services/account.service.js
touch src/services/transaction.service.js

# Database schema and seed
touch prisma/schema.prisma
touch prisma/seed.js

# Keep logs directory in git without tracking log files
touch logs/.gitkeep
