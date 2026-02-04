
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy the entire monorepo
# We need packages/ for internal dependencies
COPY . .

# Install dependencies
RUN bun install

# Build the web app
# This assumes the build command is "next build" which generates .next/standalone
WORKDIR /app/apps/web
# Pass basic env vars if needed during build, or ensure they are ignored
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

# Runner Stage
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy standalone build from builder
# The standalone build structure includes necessary node_modules and package files
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "apps/web/server.js"]
