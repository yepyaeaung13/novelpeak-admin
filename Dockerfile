# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@latest --activate

# ✅ Install with lower resource usage
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN pnpm install --frozen-lockfile

COPY . .

# ✅ Limit CPU usage (important!)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"

RUN pnpm build

# Stage 2: production
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=production
ENV PORT=3000

# ✅ Only copy necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["pnpm", "start"]