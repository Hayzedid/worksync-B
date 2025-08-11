# WorkSync Backend API

This is the backend API for the WorkSync project management application.

## Prerequisites

- Node.js v14 or higher
- MySQL database server

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables in `.env`:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=worksync
   DB_USER=root
   DB_PASSWORD=your_password

   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   JWT_EXPIRE=24h
   JWT_REFRESH_EXPIRE=7d

   # Server
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

3. Start MySQL server on your system

4. Initialize database tables:
   ```bash
   npm run init-db
   ```

5. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

- Authentication: `/api/auth`
- Projects: `/api/projects`
- Tasks: `/api/tasks`
- Notes: `/api/notes`
- Users: `/api/users`
- Workspaces: `/api/workspaces`
- Notifications: `/api/notifications`
- Calendar: `/api/calendar`
- Attachments: `/api/attachments`

## Development

For development with auto-restart:
```bash
npx nodemon src/server.js
```
