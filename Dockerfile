# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-slim AS dependencies

WORKDIR /app

# Install OpenSSL — required by Prisma on Debian
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# ── Stage 2: Production runner ─────────────────────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 finpay

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=finpay:nodejs . .

RUN mkdir -p logs && chown finpay:nodejs logs

USER finpay

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
