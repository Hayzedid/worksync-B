# WorkSync - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Installation & Setup](#installation--setup)
4. [API Reference](#api-reference)
5. [Deployment Guide](#deployment-guide)
6. [Project Structure](#project-structure)
7. [Development](#development)

---

## Overview

WorkSync is a next-generation work management platform designed to surpass existing tools like Trello and Asana. It offers real-time collaboration, advanced task management, and AI-powered productivity features.

### Core Technologies
- **Frontend**: Next.js 14 with TypeScript, TailwindCSS
- **Backend**: Node.js/Express with JWT authentication
- **Database**: MySQL with complete enterprise schema
- **Real-time**: WebSocket integration with Y.js for collaboration
- **Deployment**: Vercel (recommended) or Railway

---

## Features

### ✅ Current Features
- **User Management**: Registration, authentication, profile management
- **Project Management**: Create, organize, and manage projects
- **Task Management**: Comprehensive task creation, assignment, and tracking
- **Real-time Collaboration**: Live editing and instant updates
- **Kanban Boards**: Visual task management with drag-and-drop
- **Time Tracking**: Built-in time tracking for tasks and projects
- **Calendar Integration**: Schedule and view events
- **Comments & Notes**: Rich text commenting system
- **File Attachments**: Upload and manage project files
- **Notifications**: Real-time notification system
- **Activity Tracking**: Comprehensive audit logs
- **Workspaces**: Multi-workspace support for organizations

### 🚀 Enterprise Features
- **Advanced Analytics**: Project performance metrics
- **Custom Workflows**: Configurable task statuses and transitions
- **Role-based Access**: Granular permission system
- **API Access**: RESTful API for integrations
- **Bulk Operations**: Mass task updates and management

---

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MySQL database
- Git

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/worksync.git
   cd worksync
   ```

2. **Setup Backend**:
   ```bash
   cd worksync/server
   npm install
   
   # Create .env file
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Run database migrations
   npm run setup-db
   
   # Start server
   npm start
   ```

3. **Setup Frontend**:
   ```bash
   cd Front/client
   npm install
   
   # Create environment file
   cp .env.example .env.local
   # Edit with your backend URL
   
   # Start development server
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

---

## API Reference

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Core Endpoints
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Advanced Endpoints
- `GET /api/workspaces` - List workspaces
- `GET /api/notifications` - Get notifications
- `GET /api/calendar` - Calendar events
- `POST /api/attachments` - File uploads
- `GET /api/activity` - Activity logs

All endpoints (except auth) require JWT authentication via Authorization header or cookies.

---

## Deployment Guide

### Option 1: Vercel Deployment (Recommended)

#### Backend Deployment
1. Install Vercel CLI: `npm install -g vercel`
2. Navigate to server directory: `cd worksync/server`
3. Deploy: `vercel`
4. Set environment variables in Vercel dashboard

#### Frontend Deployment
1. Navigate to client directory: `cd Front/client`
2. Update `.env.production` with backend URL
3. Deploy: `vercel`

#### Database Setup
- Use Railway MySQL or PlanetScale for managed database
- Run migration scripts to create all tables
- Update environment variables with database credentials

### Option 2: Railway Deployment

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy backend: `railway init` and `railway up`
4. Deploy frontend to Vercel (recommended)

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=5000
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

#### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
NEXT_PUBLIC_WS_URL=wss://your-backend-url.vercel.app
NODE_ENV=production
```

---

## Project Structure

```
worksync/
├── Front/client/              # Next.js Frontend
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── components/       # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and configurations
│   │   └── types/           # TypeScript type definitions
│   ├── public/              # Static assets
│   └── package.json
├── worksync/server/          # Node.js Backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── config/          # Configuration files
│   │   ├── utils/           # Utility functions
│   │   └── socket/          # WebSocket handlers
│   ├── migrations/          # Database migrations
│   └── package.json
└── README.md               # This file
```

### Database Schema
The application uses a comprehensive MySQL schema with 26+ tables including:
- Users, workspaces, projects, tasks
- Kanban boards, time entries
- Comments, attachments, notifications
- Activity logs, calendar events
- Project analytics and reporting

---

## Development

### Available Scripts

#### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run setup-db` - Initialize database
- `npm test` - Run tests

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Features Implementation

#### Real-time Collaboration
- WebSocket server for live updates
- Y.js integration for collaborative editing
- Presence indicators and live cursors

#### Security Features
- JWT authentication with refresh tokens
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

#### Performance Optimizations
- Database query optimization
- Caching strategies
- Image optimization
- Code splitting in frontend
- Lazy loading of components

---

## Support & Contributing

### Getting Help
- Check the API documentation above
- Review the console logs for debugging
- Ensure environment variables are properly set
- Verify database connection and migrations

### Common Issues
1. **"Backend API not available"**: Check backend URL in frontend environment variables
2. **Database connection errors**: Verify database credentials and network access
3. **CORS errors**: Ensure frontend URL is in backend CORS configuration

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Test API endpoints before deploying
- Update documentation when adding features

---

## License

This project is proprietary. All rights reserved.

---

## Version History

- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added real-time collaboration
- **v1.2.0** - Enterprise features and analytics
- **Current** - Production-ready deployment

---

*Last updated: September 23, 2025*