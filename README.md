# FinPay API 

> Production-style fintech payment API platform.
> Inspired by the backend architecture of **Stripe**, **PayFast**, and **Yoco**.

Built to demonstrate enterprise backend patterns: atomic transactions,
idempotency keys, Redis-backed rate limiting, response caching, and
structured audit logging.

---

## Features

| Feature | Implementation |
|---|---|
| JWT Authentication | Register, login, protected routes |
| Wallet Accounts | ZAR balance management per user |
| Atomic Transfers | `prisma.$transaction()` — debit + credit + record, all or nothing |
| Idempotency Keys | Duplicate payment prevention backed by Redis (Stripe-style) |
| Rate Limiting | Three-tier Redis-backed limiting (global / auth / transactions) |
| Response Caching | Redis cache layer on read-heavy endpoints |
| Audit Logs | Append-only trail for every state-changing action |
| Structured Logging | Winston JSON logs with request tracing |
| Input Validation | Field-level validation with descriptive error messages |
| API Documentation | Swagger UI at `/api/docs` |
| Graceful Shutdown | SIGTERM handler — safe for Docker and Kubernetes |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 5 |
| Database | PostgreSQL 15 |
| ORM | Prisma 5 |
| Cache / Rate Limiting | Redis 7 (ioredis) |
| Authentication | JWT + bcryptjs |
| Logging | Winston |
| Validation | express-validator |
| Documentation | Swagger / OpenAPI 3 |
| Containerisation | Docker Compose |
| CI/CD | GitHub Actions |

---

## Architecture
Client Request
│
▼
[helmet + cors]         → security headers, CORS policy
[morgan]                → HTTP request logging (→ Winston)
[apiLimiter]            → global rate limit (Redis)
│
▼
[authenticate]          → JWT verify → req.user
[authLimiter]           → brute force prevention (10 req/15min)
[transactionLimiter]    → transfer abuse prevention (20 req/min)
│
▼
[idempotencyCheck]      → duplicate payment prevention (Redis, 24hr TTL)
[cache]                 → Redis response cache (configurable TTL)
[audit]                 → append-only audit log (fires after response)
│
▼
Controller → Service → Prisma ORM → PostgreSQL

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop

### Run locally

```bash
git clone https://github.com/YOUR_USERNAME/finpay-api.git
cd finpay-api

# Copy environment variables
cp .env.example .env

# Start PostgreSQL and Redis
docker compose up -d

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Seed demo data
npm run db:seed

# Start the server
npm run dev
```

API is running at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

---

## Demo Accounts (after seeding)

| User | Email | Password | Balance |
|---|---|---|---|
| Alice Smith | alice@finpay.dev | Password123 | R 10,000.00 |
| Bob Jones | bob@finpay.dev | Password123 | R 5,000.00 |
| Charlie Dube | charlie@finpay.dev | Password123 | R 2,500.00 |

---

## API Endpoints

### Auth

POST /api/v1/auth/register     Register a new user
POST /api/v1/auth/login        Login and receive JWT
GET  /api/v1/auth/me           Get current user profile

### Accounts
GET  /api/v1/accounts/me       Get wallet balance and details

### Transactions
POST /api/v1/transactions/send      Send money (requires Idempotency-Key header)
GET  /api/v1/transactions/history   Paginated transaction history
GET  /api/v1/transactions/:id       Single transaction details

### System
GET  /api/v1/health            Health check (used by CI/CD)
GET  /api/docs                 Swagger UI

---

## Key Engineering Decisions

**Atomic transfers using `prisma.$transaction()`**
Both the debit and credit happen inside a single database transaction.
If either operation fails, both are rolled back — money cannot leave
one account without arriving in another.

**Post-decrement balance guard**
After debiting the sender, the updated balance is checked for negative
values. This catches race conditions where two concurrent transfers both
passed the initial balance check but together exceed the available funds.

**Idempotency keys namespaced by user ID**
`idempotency:{userId}:{key}` — prevents a malicious user from using
another user's idempotency key to retrieve their transaction response.

**Three-tier rate limiting**
Different surfaces require different limits. Auth endpoints (10 req/15min)
are far tighter than the global API limit (100 req/15min) because brute
force attacks target login endpoints specifically.

**Generic auth error messages**
Login returns "Invalid email or password" for both wrong email and wrong
password. Specific messages (e.g. "email not found") allow attackers to
enumerate which accounts exist.

---

## CI/CD Pipeline

Every push to `main` triggers a GitHub Actions workflow that:
1. Spins up PostgreSQL and Redis services
2. Runs database migrations
3. Starts the server and hits the health endpoint
4. Builds and pushes a Docker image
5. Deploys to Railway automatically

---

## Project Inspired By

- **Stripe** — idempotency keys, structured error responses, API versioning
- **Yoco / PayFast** — ZAR-first payment processing, merchant API patterns
- **Wise** — observability, Redis caching for financial data

