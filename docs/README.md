# FinPay API

Production-style payment API platform built with Node.js, PostgreSQL, and Redis.
Inspired by the backend architecture of Stripe, PayFast, and Yoco.

---

## Architecture

![FinPay API — Complete Architecture](./images/finpay-api-master.svg)

![System Architecture](./images/architecture.svg)

The request pipeline flows through a layered middleware stack before reaching any business logic. Every inbound HTTP request passes through JWT authentication, a Redis-backed rate limiter, and an idempotency check before the route handler is invoked. A cache lookup follows — if the response is already stored in Redis, the request returns early without touching the database. Only uncached requests continue to the service layer, which issues atomic Prisma queries against PostgreSQL. Winston captures structured logs at every layer.

![Data Model](./images/data-model.svg)

The schema is built around four core tables: `users`, `accounts`, `transactions`, and `audit_logs`. Each user owns exactly one account. Transactions carry both a `senderId` and a `receiverId` foreign key into the accounts table, and are written inside a Prisma `$transaction` block so that the debit and credit are always atomic. Idempotency keys are stored in both Redis (for sub-millisecond lookup with a TTL) and the database (for durable audit purposes).

---

## Features

- **JWT Authentication** — secure registration and login with bcryptjs password hashing
- **Wallet Accounts** — balance management denominated in ZAR
- **Atomic Money Transfers** — debit and credit wrapped in a single database transaction; either both succeed or both roll back
- **Idempotency Keys** — Stripe-style duplicate payment prevention via `X-Idempotency-Key` header, backed by Redis
- **Rate Limiting** — three-tier Redis-backed limiters: global API, strict auth, and per-transaction
- **Response Caching** — Redis cache layer for read-heavy endpoints (account balance, transaction history)
- **Audit Logs** — append-only log of all sensitive actions with IP address and metadata
- **Structured Logging** — Winston JSON logs with request tracing via Morgan
- **Swagger Docs** — interactive OpenAPI 3 documentation at `/api/docs`
- **Docker** — PostgreSQL 15 and Redis 7 provisioned via Docker Compose

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express |
| Database | PostgreSQL 15 |
| ORM | Prisma |
| Cache / Rate Limiting | Redis 7 |
| Authentication | JWT + bcryptjs |
| Logging | Winston + Morgan |
| Documentation | Swagger / OpenAPI 3 |
| Containerisation | Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js v20 or higher
- Docker Desktop
- Git

### Steps

```bash
git clone https://github.com/YOUR_USERNAME/finpay-api
cd finpay-api
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The server starts on `http://localhost:3000`.
Interactive API docs are available at `http://localhost:3000/api/docs`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. The `.env` file is gitignored and must never be committed.

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://finpay_user:finpay_password@localhost:5432/finpay_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## API Overview

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Create user and wallet account | No |
| POST | `/api/v1/auth/login` | Authenticate and receive JWT | No |
| GET | `/api/v1/accounts` | Get own account balance | Yes |
| POST | `/api/v1/transactions` | Send money to another account | Yes |
| GET | `/api/v1/transactions` | List transaction history | Yes |
| GET | `/api/v1/health` | Service health check | No |

Full request and response schemas are documented in the Swagger UI.

---

## Key Design Decisions

**Idempotency**
Fintech systems cannot afford duplicate charges. The `X-Idempotency-Key` header is checked in middleware before any handler runs. If the key exists in Redis, the cached response is returned immediately. New keys are written to both Redis (TTL-expiring) and PostgreSQL (durable record). This is the same pattern used by Stripe.

**Atomic Transfers**
Money transfers use Prisma's `$transaction` block. The sender debit and receiver credit are issued as a single database transaction. If either operation fails, both roll back, ensuring no state where value leaves one account without arriving in another.

**Rate Limiting**
Three separate rate limiters are configured. A global limiter applies to all `/api` routes. A tighter limiter is applied to auth endpoints to prevent brute-force attacks. A separate limiter covers transaction endpoints. All counters are stored in Redis so they remain accurate across multiple server instances.

---

## Project Structure

```
finpay-api/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── config/          database, redis, logger
│   ├── controllers/     HTTP request and response handling
│   ├── middleware/       auth, rate limiter, idempotency, error handler
│   ├── routes/          URL routing
│   ├── services/        business logic
│   ├── utils/           response formatter, helpers
│   ├── validators/      input validation rules
│   ├── app.js           Express app setup
│   └── server.js        server entry point
├── docs/
│   ├── architecture.svg
│   └── data-model.svg
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Seed Data

The seed script creates two demo accounts:

| Email | Password | Balance |
|---|---|---|
| alice@finpay.dev | password123 | ZAR 10,000.00 |
| bob@finpay.dev | password123 | ZAR 5,000.00 |

Run with `npx prisma db seed`.

---

## Roadmap

- GitHub Actions CI pipeline (lint, test, build on every push)
- Containerised Node.js app (Docker image for the API itself)
- Deployment to Railway or Render
- Health check integration in CI (ping `/api/v1/health` post-deploy)
- Webhook events for transaction status changes
