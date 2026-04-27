# FinPay API — Phase 10: CI/CD Pipeline

Every push automatically tested. Every merge to main automatically deployed. A live public URL with a green CI badge on the GitHub profile. This is the final phase — after this the project is complete and publicly demonstrable.

---

## Pipeline Overview

![CI/CD Pipeline](./images/cicd-pipeline.svg)

Two workflows run in parallel on every push to main. `ci.yml` spins up PostgreSQL and Redis service containers, installs dependencies, runs migrations, seeds the database, starts the server in the background, polls until it is ready, runs a health check with a JSON assertion, executes four smoke tests, and builds the Docker image — in that order. `deploy.yml` installs the Railway CLI, deploys the service, waits 30 seconds for Railway to propagate, and hits the live URL with a post-deploy health check. Both must pass for the commit to be considered healthy.

---

## Dockerfile — Multi-Stage Build

![Dockerfile Stages](./images/dockerfile-stages.svg)

Two stages. Stage one (`deps`) installs only production dependencies using `npm ci` for exact reproducibility and runs `prisma generate` to build the Prisma client. Stage two (`runner`) starts from a clean Alpine base, creates a non-root system user, copies only the built artefacts from stage one, and sets the production environment. The final image contains no dev tools, no test libraries, no `.env`, and no `.git` history.

The `.dockerignore` file ensures `node_modules`, `.env`, `logs/`, and `.git` never enter the build context — not just that they are excluded from the final image, but that Docker never even reads them from disk during the build.

---

## Engineering Challenges

![Phase 10 Challenges](./images/phase10-challenges.svg)

Six pipeline and container problems — three hard build failures, two operational risks that needed deliberate decisions, and one runtime crash inside the container.

### `prisma migrate dev` hangs in CI — non-interactive shell

`prisma migrate dev` is designed for local development. When it detects pending schema changes it prompts the developer for a migration name. In a GitHub Actions runner there is no TTY and no stdin — the prompt hangs indefinitely. The job eventually times out at the 6-hour GitHub Actions limit if not caught.

```yaml
# Wrong — hangs in CI
- run: npx prisma migrate dev

# Correct — applies existing migrations without prompting
- run: npx prisma migrate deploy
```

`migrate deploy` is the correct command for CI and production. It applies all pending migrations from the `prisma/migrations/` directory in order. It does not prompt. It does not create new migration files. It is safe to run repeatedly.

### App container could not connect to PostgreSQL — port mapping confusion

The VM uses `5433:5432` in `docker-compose.yml` to avoid conflicting with system PostgreSQL. `5433` is the host port, `5432` is the container port. When the `app` service inside Docker Compose connects to `postgres`, it uses Docker's internal network — which routes by container name and uses the internal container port `5432`, not the host-mapped `5433`.

```yaml
# Local .env — correct for connecting from the VM host
DATABASE_URL=postgresql://finpay_user:finpay_password@localhost:5433/finpay_db

# docker-compose.yml app service — correct for internal Docker networking
DATABASE_URL: postgresql://finpay_user:finpay_password@postgres:5432/finpay_db
```

Both values are simultaneously correct. They operate in different network contexts. The error was using the host port inside a service that runs on the internal network.

### Health check ran before the server was ready — connection refused

`node src/server.js &` starts the server in the background and immediately returns. The next CI step ran before Prisma had connected to the database, before Redis was ready, and before the HTTP port was open. Every health check call returned `connection refused`.

The fix is a poll loop in a dedicated CI step:

```bash
for i in $(seq 1 15); do
  if curl -sf http://localhost:3000/api/v1/health > /dev/null; then
    echo "Server is ready"
    break
  fi
  echo "Attempt $i/15 — waiting 2s..."
  sleep 2
done
```

15 attempts at 2-second intervals gives the server up to 30 seconds to start. If it is not ready after 30 seconds, the loop exits without breaking and the next step fails with `connection refused` — which surfaces the problem rather than hiding it.

### Rate limiter blocked CI smoke tests — 429 Too Many Requests

The auth rate limiter (10 requests per 15 minutes) was triggered by repeated register and login calls within a single CI run. All requests came from the same IP address inside the GitHub Actions runner. After a few test runs the limiter fired and all remaining smoke tests returned 429 instead of the expected 200 or 201.

```yaml
env:
  RATE_LIMIT_MAX_REQUESTS: 1000  # CI only — production uses 100
```

Raising the limit to 1000 in the CI environment gives smoke tests effectively unlimited headroom. The production limit of 100 requests per 15 minutes is unchanged. The CI environment is explicitly labelled as `NODE_ENV: test` so the distinction is visible in logs. The smoke tests also use a unique `ci-test@finpay.dev` email address to avoid accumulating against the auth limiter's per-email counters.

### Deploy runs in parallel with CI — broken code can reach Railway before CI fails

`deploy.yml` has `needs: []` meaning it runs independently the moment a push arrives on main. If CI fails after the deploy has already started, broken code reaches Railway before the failure is caught. The post-deploy health check is the only automated safety net.

This is an accepted trade-off in the current configuration. Putting both workflows in the same file and adding `needs: [test]` to the deploy job would enforce sequential gating — deploy only runs if CI passes. That is the correct production pattern and is noted as a Phase 11 improvement. For a portfolio project, the post-deploy health check catches the majority of issues since the same code was tested locally before pushing.

### Prisma client missing from final Docker image — container crashed on startup

`prisma generate` outputs the generated client into `node_modules/.prisma`. When copying from the deps stage using `COPY --from=deps /app/node_modules ./node_modules`, the `.prisma` hidden directory was not reliably included in all environments. The container started, Node loaded the server, and the first database call threw `cannot find module @prisma/client/runtime`.

```dockerfile
# Required — both lines are necessary
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
```

The second explicit copy targets the generated client directory directly. Omitting it produces a container that builds successfully but crashes at the first database operation.

---

## Step 10.1 — Dockerfile

```bash
touch Dockerfile .dockerignore
```

Build locally to confirm it works before pushing:

```bash
docker build -t finpay-api:local .
```

The build should complete in approximately 30 seconds on a first run (downloading the Alpine base and installing packages) and under 10 seconds on a cached rebuild where only source files changed.

---

## Step 10.2 — Update docker-compose.yml

The `app` service is added to Docker Compose so `docker compose up` runs the full stack — app, postgres, and redis together. The `depends_on` block with `condition: service_healthy` ensures the app does not start until both databases have passed their healthchecks. Without this, the app starts while PostgreSQL is still initialising and the first database query fails.

---

## Step 10.3 — CI Workflow

```bash
mkdir -p .github/workflows
touch .github/workflows/ci.yml
```

The CI workflow runs on every branch push and on pull requests targeting main. It provides rapid feedback — a push to any feature branch is tested within 3 minutes without waiting for a review.

The smoke test for auth protection is deliberately minimal:

```bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/accounts/me)
[ "$RESPONSE" = "401" ] && echo "Auth protection working" || exit 1
```

It does not test business logic — that is the service layer tests' job. It verifies that the middleware pipeline is wired correctly end-to-end: an unauthenticated request to a protected route returns 401. If this fails, the entire auth stack is broken.

---

## Step 10.4 — Deploy Workflow

```bash
touch .github/workflows/deploy.yml
```

The Railway CLI `--detach` flag submits the deploy and exits without waiting for it to complete. The 30-second `sleep` that follows gives Railway time to pull the new image, start the container, and route traffic. The post-deploy health check then confirms the live URL responds correctly.

---

## Step 10.5 — GitHub Secrets

Two secrets required in the repository settings:

| Secret | Where to find it |
|---|---|
| `RAILWAY_TOKEN` | railway.app → Account → Tokens → Create Token |
| `RAILWAY_URL` | Railway project → Service → Settings → Networking → Generate Domain |

---

## Step 10.6 — Railway Setup

Railway auto-injects `DATABASE_URL` and `REDIS_URL` from linked managed services. Manual environment variables needed in the Railway Variables tab:

```
NODE_ENV                 production
PORT                     3000
JWT_SECRET               (generate locally, paste in)
JWT_EXPIRES_IN           7d
RATE_LIMIT_WINDOW_MS     900000
RATE_LIMIT_MAX_REQUESTS  100
```

After first deploy, run migrations on the Railway database:

```bash
npm install -g @railway/cli
railway login
railway link
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

## What You Now Have

| Deliverable | Status |
|---|---|
| Running API — auth, wallets, atomic transfers, idempotency, rate limiting | Complete |
| PostgreSQL — persistent data, schema, migrations | Complete |
| Redis — rate limiting, caching, idempotency store | Complete |
| Docker — full stack via docker compose up | Complete |
| Seed data — demo accounts ready for any interviewer | Complete |
| CI pipeline — every push automatically tested | Complete |
| CD pipeline — every merge to main auto-deployed | Complete |
| Live public URL — real API on the internet | Complete |
| Swagger docs — interactive, accessible at /api/docs | Complete |
| Green CI badge — visible on GitHub profile | Complete |
| Clean git history — 22 commits telling the engineering story | Complete |

---

**On the pipeline:**
Every push triggers a GitHub Actions workflow that spins up Postgres and Redis service containers, runs migrations, seeds the database, starts the server, and runs smoke tests against real endpoints. Merges to main auto-deploy to Railway with a post-deploy health check against the live URL. The build fails if anything in that chain returns an unexpected response.

**On idempotency:**
Every transaction request requires an `Idempotency-Key` header. The key is stored in Redis with a 24-hour TTL, namespaced by user ID. If the same key arrives again, the middleware returns the cached response without touching the database. This is the same pattern Stripe uses to handle network retries safely.

**On atomic transfers:**
The send money flow wraps three database operations — debit sender, credit receiver, create transaction record — in a single Prisma transaction block. If any of the three fails, all three roll back. There is no state where money leaves one account without arriving in another.

**On the gap between this and Stripe:**
Stripe runs this across hundreds of microservices with distributed Redis clusters and multi-region Postgres. This is a single-service implementation of the same patterns. Same building blocks, different operational scale. The concepts transfer directly.
