# WorkSync Backend - Phase 3: Enterprise Project Management Platform

## 🚀 Overview

WorkSync Phase 3 is a comprehensive, enterprise-grade project management backend featuring Kanban boards, time tracking, milestone management, resource allocation, and advanced collaboration tools. Built with Node.js, PostgreSQL, and Redis for maximum performance and scalability.

## ✨ Phase 3 Features

### 🎯 Core Features
- **Kanban Boards**: Full drag-and-drop project boards with columns, cards, and WIP limits
- **Time Tracking**: Professional time tracking with timers, manual entries, and detailed reporting
- **Milestone Management**: Project milestones with deliverables and progress tracking
- **Resource Allocation**: Team member capacity planning and conflict detection
- **Project Templates**: Reusable project and milestone templates
- **Advanced Analytics**: Comprehensive reporting and dashboard metrics

### 🔄 Real-time Collaboration
- **Live Updates**: Socket.IO powered real-time synchronization
- **User Presence**: See who's online and what they're working on
- **Collaborative Editing**: Y.js foundation for document collaboration
- **Activity Feeds**: Real-time activity tracking across all features

### 🏗️ Architecture Upgrades
- **PostgreSQL**: Enterprise database with UUID primary keys
- **Redis Caching**: High-performance caching and session management
- **Microservices Ready**: Modular architecture for horizontal scaling
- **Enhanced Security**: Advanced authentication, rate limiting, and input validation

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 14.0 or higher
- **Redis** 6.0 or higher
- **npm** 8.0.0 or higher

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd worksync/server
npm install
```

### 2. Database Setup

#### PostgreSQL Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Windows
# Download and install from https://www.postgresql.org/download/windows/
```

#### Create Database
```bash
sudo -u postgres createuser --createdb --login --pwprompt worksync_user
sudo -u postgres createdb --owner=worksync_user worksync_v3
```

#### Redis Installation
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS with Homebrew
brew install redis
brew services start redis

# Windows
# Download and install from https://redis.io/download
```

### 3. Environment Configuration

Copy the Phase 3 environment template:
```bash
cp .env.phase3.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://worksync_user:password@localhost:5432/worksync_v3
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=worksync_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DATABASE=worksync_v3

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here

# Security
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

### 4. Database Migration

Run the Phase 3 migration to set up PostgreSQL schema:
```bash
npm run migrate:phase3
```

This will:
- Create all PostgreSQL tables with UUID primary keys
- Migrate existing data from MySQL (if applicable)
- Set up indexes for optimal performance
- Create sample data for testing

### 5. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All API endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer your-jwt-token
```

### Kanban Boards API

#### Get Project Boards
```http
GET /api/v1/kanban/projects/{projectId}/boards
```

#### Create Board
```http
POST /api/v1/kanban/projects/{projectId}/boards
Content-Type: application/json

{
  "name": "Sprint Board",
  "description": "Main development board",
  "settings": {
    "auto_move_done": true
  }
}
```

#### Get Board Details
```http
GET /api/v1/kanban/boards/{boardId}
```

#### Create Column
```http
POST /api/v1/kanban/boards/{boardId}/columns
Content-Type: application/json

{
  "name": "In Progress",
  "color": "#007bff",
  "wip_limit": 5
}
```

#### Create Card
```http
POST /api/v1/kanban/columns/{columnId}/cards
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59Z",
  "estimated_hours": 8,
  "assignee_id": "user-uuid",
  "labels": [
    {"name": "backend", "color": "#28a745"},
    {"name": "security", "color": "#dc3545"}
  ]
}
```

#### Move Card
```http
PUT /api/v1/kanban/cards/{cardId}/move
Content-Type: application/json

{
  "target_column_id": "column-uuid",
  "target_position": 2
}
```

### Time Tracking API

#### Start Timer
```http
POST /api/v1/time-tracking/start
Content-Type: application/json

{
  "project_id": "project-uuid",
  "task_id": "card-uuid",
  "description": "Working on user authentication",
  "is_billable": true,
  "hourly_rate": 75.00
}
```

#### Stop Timer
```http
PUT /api/v1/time-tracking/stop
```

#### Get Time Entries
```http
GET /api/v1/time-tracking/entries?project_id={projectId}&start_date=2024-01-01&end_date=2024-01-31
```

#### Create Manual Entry
```http
POST /api/v1/time-tracking/entries
Content-Type: application/json

{
  "project_id": "project-uuid",
  "description": "Code review and testing",
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T11:30:00Z",
  "is_billable": true,
  "hourly_rate": 75.00,
  "tags": ["review", "testing"]
}
```

#### Get Time Report
```http
GET /api/v1/time-tracking/report?group_by=project&start_date=2024-01-01&end_date=2024-01-31
```

### Real-time Events (Socket.IO)

#### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join project room
socket.emit('join', { projectId: 'project-uuid' });
```

#### Kanban Events
```javascript
// Listen for card updates
socket.on('kanban:card:created', (card) => {
  console.log('New card created:', card);
});

socket.on('kanban:card:moved', (data) => {
  console.log('Card moved:', data);
});

socket.on('kanban:card:updated', (card) => {
  console.log('Card updated:', card);
});
```

#### Time Tracking Events
```javascript
// Listen for timer events
socket.on('time:timer:started', (timer) => {
  console.log('Timer started:', timer);
});

socket.on('time:timer:stopped', (timer) => {
  console.log('Timer stopped:', timer);
});
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test Suites
```bash
# Kanban tests
npm test -- --testPathPattern=kanban

# Time tracking tests
npm test -- --testPathPattern=time-tracking

# Integration tests
npm test -- --testPathPattern=integration
```

### Test Environment Setup
Tests use a separate PostgreSQL database. Configure in `.env`:
```env
TEST_DATABASE_URL=postgresql://worksync_user:password@localhost:5432/worksync_test
```

## 📊 Performance & Monitoring

### Database Performance
- **Connection Pooling**: Configured for 2-20 connections
- **Query Optimization**: All queries use proper indexes
- **Caching Strategy**: Redis caching for frequently accessed data

### Cache Configuration
```javascript
// Cache TTL settings
- User sessions: 24 hours
- Board data: 2 minutes
- Project lists: 5 minutes
- User presence: 5 minutes
```

### Monitoring Endpoints

#### Health Check
```http
GET /api/v1/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "90MB"
  }
}
```

#### Metrics
```http
GET /api/v1/metrics
```

## 🔧 Development

### Code Structure
```
src/
├── config/           # Database and Redis configuration
├── controllers/      # Business logic controllers
├── middleware/       # Authentication, validation, permissions
├── models/          # Database models (legacy compatibility)
├── routes/          # API route definitions
├── services/        # External service integrations
├── socket/          # Socket.IO event handlers
├── utils/           # Utility functions and validation
├── scripts/         # Migration and setup scripts
└── server.js        # Main application entry point
```

### Adding New Features

1. **Create Controller**: Add business logic in `controllers/`
2. **Define Routes**: Add API endpoints in `routes/`
3. **Add Validation**: Use express-validator for input validation
4. **Database Schema**: Update PostgreSQL schema if needed
5. **Tests**: Add comprehensive tests for new functionality
6. **Documentation**: Update API documentation

### Database Migrations

Create new migration:
```bash
npm run migration:create -- add_new_feature
```

Run migrations:
```bash
npm run migrate:latest
```

Rollback migration:
```bash
npm run migrate:rollback
```

## 🚀 Deployment

### Docker Deployment

1. **Build Image**:
```bash
docker build -t worksync-backend:v3 .
```

2. **Run with Docker Compose**:
```yaml
version: '3.8'
services:
  app:
    image: worksync-backend:v3
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/worksync
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: worksync_v3
      POSTGRES_USER: worksync_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    
volumes:
  postgres_data:
```

### Production Configuration

1. **Environment Variables**:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@production-db:5432/worksync
REDIS_URL=redis://production-redis:6379
JWT_SECRET=production-secret-key
CORS_ORIGIN=https://yourdomain.com
```

2. **Security Settings**:
- Enable HTTPS in production
- Configure rate limiting
- Set secure cookie settings
- Enable helmet security headers

3. **Monitoring**:
- Configure logging with Winston
- Set up error tracking with Sentry
- Monitor performance with New Relic or similar

## 🔐 Security

### Authentication & Authorization
- **JWT Tokens**: Access tokens (15min) + Refresh tokens (30 days)
- **Role-based Access**: Workspace and project-level permissions
- **Rate Limiting**: 100 requests/minute per IP
- **Input Validation**: Comprehensive validation and sanitization

### Data Protection
- **Password Hashing**: bcrypt with 12+ salt rounds
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Content sanitization with sanitize-html
- **CSRF Protection**: SameSite cookies and CSRF tokens

### Security Headers
```javascript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Make Changes**: Follow coding standards and add tests
4. **Run Tests**: Ensure all tests pass
5. **Submit Pull Request**: Include detailed description

### Coding Standards
- **ESLint**: Follow configured linting rules
- **Prettier**: Code formatting consistency
- **JSDoc**: Document all functions and classes
- **Testing**: Minimum 80% code coverage

### Commit Convention
```
feat: add kanban board drag and drop
fix: resolve time tracking timer sync issue
docs: update API documentation
test: add integration tests for milestones
refactor: optimize database queries
```

## 📝 Changelog

### v3.0.0 - Phase 3 Release
- ✨ **NEW**: Complete Kanban board system with drag-and-drop
- ✨ **NEW**: Professional time tracking with timers and reporting
- ✨ **NEW**: Milestone management with deliverables
- ✨ **NEW**: Resource allocation and capacity planning
- ✨ **NEW**: Project and milestone templates
- 🔄 **UPGRADE**: PostgreSQL database with UUID primary keys
- 🔄 **UPGRADE**: Redis caching and session management
- 🔄 **UPGRADE**: Enhanced real-time collaboration
- 🛡️ **SECURITY**: Advanced authentication and validation
- 📊 **PERFORMANCE**: Optimized queries and caching

### v2.0.0 - Phase 2 Release
- ✨ Real-time collaboration with Socket.IO
- ✨ Comment reactions and presence tracking
- ✨ Y.js foundation for collaborative editing
- 🔄 Enhanced database schema

### v1.0.0 - Phase 1 Release
- ✨ Basic CRUD operations
- ✨ JWT authentication
- ✨ Workspace and project management
- ✨ Task management

## 📞 Support

- **Documentation**: [API Docs](http://localhost:3000/api-docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/worksync/issues)
- **Email**: support@worksync.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**WorkSync Phase 3** - Built with ❤️ for modern project management
