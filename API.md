
# WorkSync API Reference

## Authentication
- `POST /api/auth/login` — Login, returns JWT (and sets cookie)
- `POST /api/auth/register` — Register new user (default role: user)
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset password
- `POST /api/auth/logout` — Logout (clears cookie)

## Users
- `GET /api/users/profile` — Get current user profile (requires authentication)
- `PUT /api/users/profile` — Update profile (requires authentication)
- `GET /api/users` — List all users (**admin only**)
- `GET /api/users/online` — List online users (**admin only**)
- `GET /api/users/:id` — Get user by ID (**admin only**)
- `DELETE /api/users/:id` — Delete user (**admin only**)

## Projects
- `GET /api/projects` — List projects
- `POST /api/projects` — Create project
- `GET /api/projects/:id` — Get project
- `PUT /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project

## Tasks
- `GET /api/tasks` — List tasks
- `POST /api/tasks` — Create task
- `GET /api/tasks/:id` — Get task
- `PUT /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task

## Notes
- `GET /api/notes` — List notes
- `POST /api/notes` — Create note
- `GET /api/notes/:id` — Get note
- `PUT /api/notes/:id` — Update note
- `DELETE /api/notes/:id` — Delete note

## Comments
- `POST /api/comments` — Add comment (requires authentication)
- `POST /api/:type/:id/comments` — Add comment to resource (task, note, project)
- `GET /api/:type/:id/comments` — List comments for resource

## Workspaces, Events, Tags, Notifications, Calendar, Attachments
- Similar RESTful endpoints for each resource

## Health
- `GET /api/health` — Server status

---

## Authentication & Authorization
- All endpoints require Bearer token unless noted.
- Admin-only endpoints are marked (**admin only**).
- Role-based access control (RBAC) is enforced using the `role` field on users.
- To access admin endpoints, the user must have `role: 'admin'`.

## Error Responses
All errors are returned as:
```json
{
	"success": false,
	"message": "...error message..."
}
```
Validation errors may include an `errors` array.

## Usage Example
**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
	"email": "user@example.com",
	"password": "password123"
}
```
**Response:**
```json
{
	"success": true,
	"message": "Login successful",
	"token": "...jwt...",
	"user": {
		"id": 1,
		"email": "user@example.com",
		"firstName": "John",
		"lastName": "Doe",
		"emailVerified": false
	}
}
```

---
For more details, see the README or contact the backend team.
