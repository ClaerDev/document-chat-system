#!/bin/sh
# Entrypoint script for Docling service
# Ensures uvicorn runs WITHOUT reload flag in production

set -e

PORT=${PORT:-8001}
HOST=${HOST:-0.0.0.0}

echo "Starting Docling API service..."
echo "Host: $HOST"
echo "Port: $PORT"
echo "Memory optimization: Single worker, limited queue"

# Run uvicorn with memory optimization for Railway's 512MB limit
# --workers 1: Single worker to reduce memory footprint
# --limit-concurrency 2: Limit concurrent requests to avoid memory spikes
# --timeout-keep-alive 10: Close idle connections faster
exec uvicorn main:app \
  --host "$HOST" \
  --port "$PORT" \
  --workers 1 \
  --limit-concurrency 2 \
  --timeout-keep-alive 10 \
  --log-level info
