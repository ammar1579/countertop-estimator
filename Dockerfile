# Quick Quartz — Dockerfile for Google Cloud Run
# Multi-stage build: builder installs all deps and builds, runner is lean production image.

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy dependency manifests and patches first (layer cache)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (devDeps needed for Vite build + esbuild)
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY . .

# Build frontend (Vite → dist/public) + backend (esbuild → dist/index.js)
RUN pnpm build

# ─── Stage 2: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm@10.4.1

# Copy dependency manifests and patches
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Cloud Run injects PORT. Keep the container default aligned with Cloud Run.
EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/health || exit 1

CMD ["node", "dist/index.js"]
