#!/bin/bash

# WorkSync Backend Deployment Script
echo "🚀 Starting WorkSync Backend Deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Navigate to backend directory
cd worksync/server

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one with your environment variables."
    echo "Required variables:"
    echo "- NODE_ENV=production"
    echo "- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
    echo "- JWT_SECRET"
    echo "- FRONTEND_URL"
    exit 1
fi

# Login to Railway (if not already logged in)
echo "🔐 Logging into Railway..."
railway login

# Initialize Railway project (if not already initialized)
echo "📦 Initializing Railway project..."
railway init

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Backend deployment complete!"
echo "📝 Don't forget to:"
echo "1. Set environment variables in Railway dashboard"
echo "2. Set up your MySQL database"
echo "3. Run database migrations"
echo "4. Update frontend with backend URL"
