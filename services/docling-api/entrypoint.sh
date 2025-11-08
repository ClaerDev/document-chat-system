#!/bin/sh
# Entrypoint script for Docling service
# Ensures uvicorn runs WITHOUT reload flag in production

set -e

PORT=${PORT:-8001}
HOST=${HOST:-0.0.0.0}

echo "Starting Docling API service..."
echo "Host: $HOST"
echo "Port: $PORT"

# Run uvicorn WITHOUT --reload flag
exec uvicorn main:app --host "$HOST" --port "$PORT" --log-level info
