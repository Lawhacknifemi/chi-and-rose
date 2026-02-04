
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies
RUN bun install

# Build the server
WORKDIR /app/apps/server
ENV NODE_ENV=production
# 'bun run build' in package.json runs 'tsdown', make sure that's correct
# Or we just use the source with bun? 
# apps/server/package.json says: "build": "tsdown"
# and "start": "bun run dist/index.js"
RUN bun run build

# Runner Stage
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and package.json to run scripts
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./package.json

# We might need node_modules if not bundled? 
# Bun bundles usually, but tsdown might not bundle dependencies in node_modules.
# Let's check node_modules. Usually safer to just copy the mono-repo node_modules 
# or reinstall prod deps.
# For simplicity in this guide, we'll try copying the dist. 
# If tsdown doesn't bundle, we need to install prod deps.
# Inspecting package.json -> dependencies include local workspaces. This suggests we need them.
# A simpler approach for Server (Bun) in Monorepo without bundling is to just run from source 
# or copy everything.
# Let's assume we copy node_modules from builder for now to be safe.
COPY --from=builder /app/node_modules ./node_modules
# And we need workspace packages built/available? 
# If tsdown bundles code but leaves external deps...
# Actually, let's stick to a simpler "Run from Source" or "Bundled" approach?
# tsdown typically handles transpilation. 
# Better yet: Copy the whole monorepo state pruned? 
# No, let's just copy the whole necessary tree for the runner, slightly larger image but safer for user.

# Alternative: Pruned Runner
# Re-copying everything from builder for the runner context might be cleaner.
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server ./apps/server

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["bun", "dist/index.js"]
