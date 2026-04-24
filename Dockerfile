# ─────────────────────────────────────────
# Stage 1: Dependencies
# Install only production deps in a clean layer
# ─────────────────────────────────────────
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# ─────────────────────────────────────────
# Stage 2: Production image
# Lean final image — no dev tools, no test files
# ─────────────────────────────────────────
FROM node:20-alpine AS deps

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 finpay

WORKDIR /app

# Copy installed deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

# Copy source
COPY --chown=finpay:nodejs . .

# Create logs directory with correct ownership
RUN mkdir -p logs && chown finpay:nodejs logs

USER finpay

EXPOSE 3000

ENV NODE_ENV=production

# Health check — Docker will mark container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
