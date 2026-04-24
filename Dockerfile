# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# ── Stage 2: Production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 finpay

WORKDIR /app

# Copy installed deps from stage 1 (note: --from=dependencies not deps)
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source
COPY --chown=finpay:nodejs . .

RUN mkdir -p logs && chown finpay:nodejs logs

USER finpay

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
