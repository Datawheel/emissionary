#!/bin/bash

set -e

echo "🚀 Starting deployment..."

echo "📦 Pulling latest changes..."
git pull

echo "🐳 Building Docker image..."
docker build -t "emissionary:latest" .

echo "⏬ Stopping running containers..."
docker compose down

echo "⏫ Starting updated containers..."
# First deploy or after data changes: SYNC_ITEMS=1 ./deploy_latest.sh
docker compose --env-file .env up -d

echo "✅ Deployment complete!"
