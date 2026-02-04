


# Use Node.js as the base image to ensure 'worker_threads' and other internals work perfectly for Next.js build
FROM node:20-bookworm-slim AS builder

# Install Bun
ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.0" && \
    apt-get clean

WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies (using Bun for speed)
RUN bun install --frozen-lockfile

# Build Everything
# 1. Build Web (Next.js Standalone) - Runs with Node.js runtime (via npm run build / next build)
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Skip env validation during build (standard for T3 env)
ENV SKIP_ENV_VALIDATION=1
# Provide dummy value just in case validation isn't skipped
ENV NEXT_PUBLIC_SERVER_URL="http://placeholder"

# IMPORTANT: We use 'bun run build' which invokes 'next build'. 
# Since we are in a Node image, the 'node' binary is Node.js, so Next.js uses Node. 
# Explicitly use 'npm run build' to be 100% sure we use Node runtime.
RUN npm run build

# 2. Build Server (Bun Compile -> Single Binary)
# Bun compile still works fine because we have bun installed
WORKDIR /app/apps/server
RUN bun run compile

# --- Runner Stage ---
# We use Bun-slim for runner because the *server* is a Bun binary and Web is standalone (works on Node or Bun, but we tend to use Bun for runner)
# Actually, sticking to Bun-slim runner is risky if we have dependencies that need Node.
# But 'server' is a compiled binary. 'web' is Next.js standalone.
# Let's stick to bun:1.2.0-slim for the runner to match the happy path of "Bun Runtime".
# Next.js standalone works on Bun usually.

FROM oven/bun:1.2.0-slim AS runner
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
