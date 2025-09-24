#!/bin/bash

# WorkSync Backend Deployment Script for Render
echo "🚀 Starting WorkSync Backend Deployment to Render..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the worksync/server directory."
    exit 1
fi

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found. Please ensure the configuration file exists."
    exit 1
fi

echo "✅ Configuration files found"
echo "📋 Environment variables configured:"
echo "   - NODE_ENV: production"
echo "   - PORT: 5000"
echo "   - DB_HOST: gondola.proxy.rlwy.net"
echo "   - DB_PORT: 26492"
echo "   - DB_NAME: railway"
echo "   - FRONTEND_URL: https://worksync-c.vercel.app"

echo ""
echo "🔧 Next steps:"
echo "1. Push your code to GitHub (if not already done)"
echo "2. Go to https://render.com"
echo "3. Sign up/Login with your GitHub account"
echo "4. Click 'New +' → 'Web Service'"
echo "5. Connect your GitHub repository"
echo "6. Select the worksync/server directory as the root directory"
echo "7. Use these settings:"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "8. Add environment variables (or use the render.yaml file)"
echo "9. Click 'Create Web Service'"

echo ""
echo "📝 After deployment:"
echo "1. Get your Render backend URL"
echo "2. Update your Vercel frontend environment variables:"
echo "   - NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com"
echo "   - NEXT_PUBLIC_SOCKET_URL=wss://your-render-backend-url.onrender.com"
echo "3. Run database migration:"
echo "   - Connect to your Render service"
echo "   - Run: node src/config/setupDatabase.js"

echo ""
echo "✅ Deployment preparation complete!"
