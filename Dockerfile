# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy deps first (cache)
COPY package.json pnpm-lock.yaml ./

# Limit memory usage
ENV NODE_OPTIONS="--max-old-space-size=1024"

RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build
RUN pnpm build


# Stage 2: Runner (small image)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output only (🔥 important)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Run standalone server
CMD ["node", "server.js"]