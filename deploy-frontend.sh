#!/bin/bash

# WorkSync Frontend Deployment Script
echo "🚀 Starting WorkSync Frontend Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Navigate to frontend directory
cd Front/client

# Check if .env.local file exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found. Please create one with your environment variables."
    echo "Required variables:"
    echo "- NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app"
    echo "- NEXT_PUBLIC_SOCKET_URL=wss://your-backend-url.railway.app"
    echo "- NODE_ENV=production"
    exit 1
fi

# Build the project
echo "🔨 Building Next.js project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Frontend deployment complete!"
echo "📝 Don't forget to:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Update CORS settings in backend"
echo "3. Test the deployed application"
