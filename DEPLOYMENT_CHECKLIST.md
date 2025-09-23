# WorkSync Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables

#### Backend (.env in worksync/server/)
```env
NODE_ENV=production
PORT=5000
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=worksync
JWT_SECRET=your_secure_jwt_secret_here
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

#### Frontend (.env.local in Front/client/)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_SOCKET_URL=wss://your-backend-url.railway.app
NODE_ENV=production
```

### 2. Database Setup

#### Option A: Railway MySQL
1. Add MySQL service in Railway dashboard
2. Copy connection details to backend environment variables

#### Option B: External MySQL
1. Create MySQL database (PlanetScale, AWS RDS, etc.)
2. Run migration: `cd worksync/server && node src/config/setupDatabase.js`

## Deployment Steps

### Backend (Railway)
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Navigate to backend: `cd worksync/server`
4. Initialize: `railway init`
5. Deploy: `railway up`
6. Set environment variables in Railway dashboard

### Frontend (Vercel)
1. Install Vercel CLI: `npm install -g vercel`
2. Navigate to frontend: `cd Front/client`
3. Build: `npm run build`
4. Deploy: `vercel --prod`
5. Set environment variables in Vercel dashboard

## Post-Deployment

### 1. Test Endpoints
- Health check: `GET https://your-backend-url.railway.app/api/health`
- Authentication: `POST https://your-backend-url.railway.app/api/auth/login`

### 2. Update CORS Settings
Ensure backend CORS includes your frontend domain:
```javascript
// In worksync/server/src/middleware/security.js
const allowedOrigins = [
  'https://your-frontend-domain.vercel.app',
  'http://localhost:3000' // for development
];
```

### 3. Database Migration
Run the complete database setup:
```bash
cd worksync/server
node src/config/setupDatabase.js
```

### 4. Test Real-time Features
- Test Socket.IO connection
- Test collaborative editing
- Test user presence

## Troubleshooting

### Common Issues
1. **CORS Errors**: Update CORS settings in backend
2. **Database Connection**: Check environment variables
3. **Socket.IO Issues**: Ensure WebSocket URL is correct
4. **Build Failures**: Check Node.js version compatibility

### Logs
- Railway: Check logs in Railway dashboard
- Vercel: Check logs in Vercel dashboard

## Security Checklist
- [ ] JWT secret is secure and random
- [ ] Database credentials are secure
- [ ] CORS is properly configured
- [ ] HTTPS is enabled
- [ ] Environment variables are not exposed

## Performance Optimization
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure caching headers
- [ ] Monitor database performance
