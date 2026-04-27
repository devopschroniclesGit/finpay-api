# FinPay API — Setup Guide

Phases 1–3: Scaffolding, Dependencies, Docker, and Database.
Every phase ends with a real git commit. By the end you will have 3 commits on GitHub and two running containers.

---

## Git Commit Flow

![Git Workflow](./images/git-workflow.svg)

Three commits, one per phase. Each commit represents one logical unit of work — the same structure professional engineering teams use. The `.env` file is never committed at any point.

---

## Prerequisites

Run each of the following before starting. If any fail, fix the install before continuing.

```bash
node --version        # must be v20.x.x or higher
npm --version         # must be 9.x or higher
docker --version
docker compose version
git --version
```

If Node is below v20, install it from https://nodejs.org (LTS) or via nvm:

```bash
nvm install 20 && nvm use 20
```

---

## Phase 1 — Project Scaffolding

### Step 1.1 — Create the project and initialise git

```bash
mkdir finpay-api
cd finpay-api
git init
```

### Step 1.2 — Configure git identity

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### Step 1.3 — Create .gitignore first

Always create `.gitignore` before running `npm init`. This ensures npm-generated files are never accidentally staged.

```bash
touch .gitignore
```

Paste into `.gitignore`:

```
# Dependencies
node_modules/

# Environment — NEVER commit this
.env

# Logs
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# Build output
dist/
build/

# Prisma generated client
node_modules/.prisma/
```

### Step 1.4 — Initialise npm

```bash
npm init -y
```

### Step 1.5 — Edit package.json

Replace the entire contents with:

```json
{
  "name": "finpay-api",
  "version": "1.0.0",
  "description": "Production-style fintech payment API — auth, wallets, transfers, rate limiting, caching, idempotency",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed": "node prisma/seed.js"
  },
  "keywords": ["fintech", "api", "payments", "nodejs", "express", "prisma"],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

The `engines` field tells CI/CD and deployment platforms exactly which Node version to use.

### Step 1.6 — Create the full folder structure

```bash
mkdir -p src/config src/controllers src/middleware src/routes src/services src/utils src/validators
mkdir -p prisma logs

touch src/app.js src/server.js
touch src/config/database.js src/config/redis.js src/config/logger.js
touch src/utils/response.js src/utils/asyncHandler.js
touch src/middleware/auth.js src/middleware/rateLimiter.js src/middleware/idempotency.js
touch src/middleware/cache.js src/middleware/auditLogger.js src/middleware/errorHandler.js
touch src/controllers/auth.controller.js src/controllers/account.controller.js src/controllers/transaction.controller.js
touch src/routes/index.js src/routes/auth.routes.js src/routes/account.routes.js src/routes/transaction.routes.js
touch src/services/auth.service.js src/services/account.service.js src/services/transaction.service.js
touch prisma/schema.prisma prisma/seed.js
touch logs/.gitkeep
```

Verify:

```bash
find src -type f | sort
```

### Commit 1

```bash
git add .
git status
git commit -m "chore: initialise project scaffold

- npm project with engines field (node >=20)
- full src/ directory structure (config, controllers, middleware, routes, services, utils)
- prisma/ directory for schema and seed
- .gitignore covering node_modules, .env, logs, dist"
```

---

## Phase 2 — Install Dependencies

### Step 2.1 — Install production dependencies

```bash
npm install \
  express \
  @prisma/client \
  jsonwebtoken \
  bcryptjs \
  ioredis \
  express-rate-limit \
  rate-limit-redis \
  winston \
  cors \
  helmet \
  morgan \
  express-validator \
  dotenv \
  swagger-ui-express \
  swagger-jsdoc \
  uuid
```

### Step 2.2 — Install development dependencies

```bash
npm install --save-dev nodemon
```

### Step 2.3 — Initialise Prisma

```bash
npx prisma init --datasource-provider postgresql
```

Verify `.env` is still gitignored after this step:

```bash
git status
```

`.env` must not appear. If it does:

```bash
git rm --cached .env
```

### Commit 2

```bash
git add package.json package-lock.json prisma/schema.prisma
git commit -m "chore: install dependencies and initialise Prisma

Production: express, prisma, jsonwebtoken, bcryptjs, ioredis,
express-rate-limit, rate-limit-redis, winston, cors, helmet,
morgan, express-validator, dotenv, swagger-ui-express, swagger-jsdoc, uuid

Dev: nodemon

Prisma initialised with PostgreSQL datasource"
```

---

## Phase 3 — Docker, Environment Variables, and Database

### Docker Infrastructure

![Docker Infrastructure](./images/docker-infrastructure.svg)

Two containers are provisioned by Docker Compose: `finpay_postgres` on port 5432 and `finpay_redis` on port 6379. Both run on the same internal Docker network and both include healthchecks. The Node.js app connects to them via `DATABASE_URL` and `REDIS_URL` defined in `.env`.

### Step 3.1 — docker-compose.yml

```bash
touch docker-compose.yml
```

Paste into `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: finpay_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: finpay_db
      POSTGRES_USER: finpay_user
      POSTGRES_PASSWORD: finpay_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U finpay_user -d finpay_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: finpay_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory-policy allkeys-lru --loglevel warning
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Step 3.2 — .env (not committed)

```bash
touch .env
```

Paste into `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://finpay_user:finpay_password@localhost:5432/finpay_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET=change-this-to-a-long-random-string-before-deploying
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Generate a real JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 3.3 — .env.example (committed)

```bash
touch .env.example
```

Paste into `.env.example`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
REDIS_URL="redis://localhost:6379"
JWT_SECRET=your-jwt-secret-here-generate-with-command-above
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 3.4 — Start Docker

```bash
docker compose up -d
```

Verify both containers are healthy:

```bash
docker compose ps
```

Both `finpay_postgres` and `finpay_redis` must show `Up (healthy)`. If they show `starting`, wait 15 seconds and run `docker compose ps` again.

Test connections directly:

```bash
docker exec finpay_postgres pg_isready -U finpay_user -d finpay_db
docker exec finpay_redis redis-cli ping
```

Expected output:

```
localhost:5432 - accepting connections
PONG
```

### Step 3.5 — Update prisma/schema.prisma

Replace the entire contents with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  firstName    String
  lastName     String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  account   Account?
  auditLogs AuditLog[]

  @@map("users")
}

model Account {
  id        String   @id @default(uuid())
  userId    String   @unique
  balance   Decimal  @default(0.00) @db.Decimal(18, 2)
  currency  String   @default("ZAR")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user       User          @relation(fields: [userId], references: [id])
  sentTx     Transaction[] @relation("sender")
  receivedTx Transaction[] @relation("receiver")

  @@map("accounts")
}

model Transaction {
  id             String            @id @default(uuid())
  idempotencyKey String?           @unique
  senderId       String
  receiverId     String
  amount         Decimal           @db.Decimal(18, 2)
  currency       String            @default("ZAR")
  status         TransactionStatus @default(PENDING)
  description    String?
  metadata       Json?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  sender   Account @relation("sender",   fields: [senderId],   references: [id])
  receiver Account @relation("receiver", fields: [receiverId], references: [id])

  @@map("transactions")
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String
  entity    String
  entityId  String?
  oldData   Json?
  newData   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}
```

### Step 3.6 — Run the migration

```bash
npm run db:migrate
```

When prompted for a migration name, type `init` and press Enter.

### Step 3.7 — Verify tables

```bash
docker exec -it finpay_postgres psql -U finpay_user -d finpay_db -c "\dt"
```

You should see: `accounts`, `audit_logs`, `transactions`, `users`, and `_prisma_migrations`.

### Commit 3

```bash
git add docker-compose.yml .env.example prisma/schema.prisma
git status
```

Confirm `.env` is not in the staged files, then commit:

```bash
git commit -m "chore: add Docker infrastructure and database schema

Docker Compose:
- PostgreSQL 15 (alpine) with healthcheck
- Redis 7 (alpine) with healthcheck, LRU eviction, AOF persistence

Prisma schema:
- User, Account, Transaction, AuditLog models
- TransactionStatus enum (PENDING, COMPLETED, FAILED, REVERSED)
- Decimal(18,2) for financial amounts
- UUID primary keys

Migrations:
- init applied successfully"
```

---

## Verification Checklist

Run all of these before pushing:

```bash
git log --oneline          # must show 3 commits
docker compose ps          # both containers healthy
docker exec -it finpay_postgres psql -U finpay_user -d finpay_db -c "\dt"
docker exec finpay_redis redis-cli ping
ls node_modules | wc -l   # should be above 100
git status                 # .env must not appear
```

---

## Push to GitHub

1. Go to https://github.com/new
2. Name the repo `finpay-api`
3. Set to Public
4. Do not tick "Add a README" — you already have one
5. Click Create repository

Then connect and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/finpay-api.git
git branch -M main
git push -u origin main
```

Open your repo on GitHub and confirm: 3 commits visible, `.env` absent from the file list.

---

## Commit History After Phase 3

```
chore: add Docker infrastructure and database schema
chore: install dependencies and initialise Prisma
chore: initialise project scaffold
```

---

## What Comes Next

Phase 4 onward fills in every source file and makes the server run. The same commit convention continues:

```
feat: add JWT authentication middleware and auth service
feat: add account service with Redis caching
feat: add transaction service with atomic transfers and idempotency
feat: add rate limiting middleware (global, auth, transaction tiers)
feat: add Swagger documentation
feat: add database seed with demo accounts
```

When the CI/CD pipeline is added in the final phase, GitHub Actions will validate every commit on every push — meaning the clean history you built here will be verified automatically.
