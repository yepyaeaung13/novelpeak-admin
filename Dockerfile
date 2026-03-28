# Stage 1: build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy dependency files first for caching
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source
COPY . .

# Build next app
RUN pnpm run build

# Stage 2: production image
FROM node:20-alpine AS runner
WORKDIR /app

# Production dependencies only
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built assets + package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/next-env.d.ts ./
COPY --from=builder /app/node_modules ./node_modules

# Set NODE_ENV
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run application
CMD ["pnpm", "start"]