
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies (frozen-lockfile is safer for CI)
RUN bun install --frozen-lockfile

# Build Everything
# 1. Build Web (Next.js Standalone)
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Skip env validation during build (standard for T3 env)
ENV SKIP_ENV_VALIDATION=1
# Provide dummy value just in case validation isn't skipped
ENV NEXT_PUBLIC_SERVER_URL="http://placeholder"
RUN bun run build

# 2. Build Server (Bun Compile -> Single Binary)
WORKDIR /app/apps/server
RUN bun run compile

# --- Runner Stage ---
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy Next.js Web Artifacts
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# public folder does not exist in this project
# COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy API Server Artifacts
# we copy the compiled binary 'server'
COPY --from=builder /app/apps/server/server ./server

# Copy Entrypoint
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Expose Port
EXPOSE 3000

# Set Entrypoint
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
