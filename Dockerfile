# syntax=docker/dockerfile:1

# ── Stage 1: Build React client ───────────────────────────────────────────────
FROM node:20-slim AS client-builder

WORKDIR /app/client

# Install client dependencies
COPY client/package*.json ./
RUN npm ci

# Copy client source and build
COPY client/ ./
RUN npm run build

# ── Stage 2: Install API production dependencies ───────────────────────────────
FROM node:20-slim AS dependencies

WORKDIR /app

# Install OpenSSL — required by Prisma on Debian
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# ── Stage 3: Production runner ─────────────────────────────────────────────────
FROM node:20-slim AS runner

# Install OpenSSL in final image too
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 finpay

WORKDIR /app

# Copy API dependencies from stage 2
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built React app from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Copy API source code
COPY --chown=finpay:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown finpay:nodejs logs

USER finpay

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
