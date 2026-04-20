#!/bin/sh
set -e

echo "🚀 Starting Ticket System API..."

# Generate Prisma client (requires DATABASE_URL)
echo "📦 Generating Prisma client..."
cd packages/database && npx prisma generate && cd ../..

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set!"
  exit 1
fi

echo "✅ Prisma client generated"
echo "🎯 Starting server..."

# Start the API
exec node packages/api/dist/index.js
