#!/bin/bash

# Wait for Next.js to be ready before starting Inngest
echo "⏳ Waiting for Next.js to be ready..."

# Wait up to 60 seconds for Next.js to start
for i in {1..60}; do
  if curl -s http://localhost:3000/api/inngest > /dev/null 2>&1; then
    echo "✅ Next.js is ready!"
    break
  fi

  if [ $i -eq 60 ]; then
    echo "⚠️  Next.js not ready after 60 seconds, starting Inngest anyway..."
  fi

  sleep 1
done

# Small additional delay to ensure endpoint is fully ready
sleep 2

echo "🚀 Starting Inngest Dev Server..."
npx inngest-cli@latest dev
