#!/bin/sh
set -e

# Default to server if not specified
SERVICE=${APP_SERVICE:-server}

echo "Starting Application Service: $SERVICE"

if [ "$SERVICE" = "web" ]; then
    echo "Launching Web Dashboard (Next.js)..."
    # Execute the standalone Next.js server
    exec bun apps/web/server.js
elif [ "$SERVICE" = "server" ]; then
    echo "Launching API Server..."
    # Execute the compiled API server
    exec bun dist/index.js
else
    echo "Error: Unknown APP_SERVICE '$SERVICE'. Must be 'web' or 'server'."
    exit 1
fi
