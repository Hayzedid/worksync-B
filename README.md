# WorkSync Backend

A professional Node.js/Express backend for task, project, and workspace management with MySQL, JWT authentication, and robust security best practices.

## Features
- User authentication (JWT, Bearer tokens)
- Project, task, note, workspace, event, comment, tag, notification management
- Service layer, validation, and centralized error handling
- Secure HTTP headers (helmet), CORS, rate limiting, XSS protection
- Knex.js migrations (recommended)
- Centralized config and environment variables

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MySQL server

### Setup
1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your DB and JWT settings
3. Install dependencies:
   ```sh
   npm install
   ```
4. (Recommended) Run DB migrations:
   ```sh
   npx knex migrate:latest --knexfile worksync/knexfile.js
   ```
5. Start the server:
   ```sh
   npm start
   ```

### Environment Variables
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `PORT` (default: 5000)
- `FRONTEND_URL` (CORS)

## API Usage
- All endpoints are under `/api/`
- Authenticate with Bearer tokens (JWT)
- Example: `Authorization: Bearer <token>`

### Health Check
- `GET /api/health` — returns server status

## Migrations
- Use Knex.js for schema changes:
  - `npx knex migrate:make <name> --knexfile worksync/knexfile.js`
  - `npx knex migrate:latest --knexfile worksync/knexfile.js`
  - `npx knex migrate:rollback --knexfile worksync/knexfile.js`

## Testing
- Run tests with:
  ```sh
  npm test
  ```

## Security
- Helmet, CORS, rate limiting, XSS protection
- HTTPS enforced in production
- No sensitive data in logs

## Contributing
Pull requests welcome! Please open issues for bugs or feature requests.

---
