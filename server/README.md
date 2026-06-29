# NexIDE Server

Collaborative Cloud IDE - Backend Server

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** Neon PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Logging:** Winston + Morgan
- **Security:** Helmet, CORS, Rate Limiting, bcrypt, JWT

## Project Structure

```
server/
├── src/
│   ├── config/         # Configuration files (env, cors, logger, rateLimiter, jwt)
│   ├── constants/      # Application constants
│   ├── controllers/    # Route handlers
│   ├── services/       # Business logic layer
│   ├── repositories/   # Database access layer
│   ├── routes/         # API route definitions
│   ├── middlewares/     # Express middlewares (auth, error, validation)
│   ├── validators/     # Zod validation schemas
│   ├── helpers/        # Helper utilities
│   ├── utils/          # Reusable utilities (ApiResponse, AppError, asyncHandler)
│   ├── lib/            # Third-party client initialization (Prisma)
│   ├── prisma/         # Prisma-specific code
│   ├── logs/           # Log files
│   ├── app.js          # Express app configuration
│   └── server.js       # Server entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── .env.example        # Environment variables template
└── package.json
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Neon PostgreSQL database

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   - Set `DATABASE_URL` to your Neon PostgreSQL connection string
   - Set `COOKIE_SECRET` to a secure random string (min 32 characters)
   - Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (min 32 characters each)
   - Optionally configure Google OAuth variables

5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

## Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Health Check

```
GET /api/v1/health
```

### Authentication

```
POST /api/v1/auth/register      # Register a new user
POST /api/v1/auth/login         # Login with email/password
POST /api/v1/auth/logout        # Logout current user
POST /api/v1/auth/refresh       # Refresh access token
POST /api/v1/auth/google        # Google OAuth authentication
GET  /api/v1/auth/me            # Get current authenticated user
```

### Users

```
GET    /api/v1/users/me                   # Get own profile
PATCH  /api/v1/users/me                   # Update own profile
PATCH  /api/v1/users/change-password      # Change password
DELETE /api/v1/users/me                   # Delete account (soft delete)
GET    /api/v1/users/me/preferences       # Get user preferences
PATCH  /api/v1/users/me/preferences       # Update user preferences
GET    /api/v1/users/check-username/:name # Check username availability
GET    /api/v1/users/:username            # Get public profile
```

### Projects

```
POST   /api/v1/projects                                    # Create a project
GET    /api/v1/projects                                    # List my projects (search, filter, paginate)
GET    /api/v1/projects/:id                                # Get project by ID
PATCH  /api/v1/projects/:id                                # Update project
DELETE /api/v1/projects/:id                                # Soft delete project
DELETE /api/v1/projects/:id/permanent                      # Permanent delete (owner only)
PATCH  /api/v1/projects/:id/archive                        # Archive project
PATCH  /api/v1/projects/:id/restore                        # Restore archived project
POST   /api/v1/projects/:id/duplicate                      # Duplicate project
POST   /api/v1/projects/:id/open                           # Mark project as opened
POST   /api/v1/projects/:id/favorite                       # Add to favorites
DELETE /api/v1/projects/:id/favorite                       # Remove from favorites
GET    /api/v1/projects/favorites                          # Get favorite projects
GET    /api/v1/projects/recent                             # Get recently opened projects
GET    /api/v1/projects/check-slug/:slug                   # Check slug availability
```

### Workspace & Members

```
GET    /api/v1/projects/:projectId/workspace             # Get workspace
PATCH  /api/v1/projects/:projectId/workspace             # Update workspace
GET    /api/v1/projects/:projectId/members               # List members
POST   /api/v1/projects/:projectId/members/invite        # Invite member by email
PATCH  /api/v1/projects/:projectId/members/:memberId/role # Change member role
DELETE /api/v1/projects/:projectId/members/:memberId     # Remove member
POST   /api/v1/invitations/:token/accept                 # Accept invitation
POST   /api/v1/invitations/:token/reject                 # Reject invitation
```

### File System

```
GET    /api/v1/projects/:projectId/files/tree                # Get full file/folder tree
POST   /api/v1/projects/:projectId/folders                   # Create folder
PATCH  /api/v1/projects/:projectId/folders/:folderId/rename  # Rename folder
DELETE /api/v1/projects/:projectId/folders/:folderId         # Delete folder (recursive)
POST   /api/v1/projects/:projectId/files                     # Create file
GET    /api/v1/projects/:projectId/files/:fileId             # Get file content
PUT    /api/v1/projects/:projectId/files/:fileId             # Update file content
PATCH  /api/v1/projects/:projectId/files/:fileId/rename      # Rename file
DELETE /api/v1/projects/:projectId/files/:fileId             # Delete file
```

## Authentication Flow

1. **Register** — User sends `fullName`, `username`, `email`, `password`. Password is hashed with bcrypt (12 rounds). Returns user data (no password/refreshToken).

2. **Login** — Validates email/password, generates access token (JWT, 15min) and refresh token (JWT, 7d). Refresh token stored in HttpOnly cookie and database. Returns access token + user data.

3. **Authenticated Requests** — Include `Authorization: Bearer <accessToken>` header. Middleware verifies JWT, attaches user to `req.user`.

4. **Token Refresh** — Sends refresh token (from cookie or body). Server verifies it, checks DB match, issues new pair. Old refresh token invalidated (rotation).

5. **Logout** — Clears refresh cookie, nullifies refresh token in DB.

## Google OAuth Flow

1. Client obtains Google ID token via Google Identity Services.
2. Client sends `{ idToken }` to `POST /api/v1/auth/google`.
3. Server verifies token with Google, extracts profile info.
4. If user exists → login. If not → auto-register with `GOOGLE` provider.
5. Returns access token + refresh token (same as login).

## Role System

| Role | Description |
|------|-------------|
| OWNER | Full system access |
| ADMIN | Administrative privileges |
| EDITOR | Can edit resources |
| VIEWER | Read-only access |

Default role on registration: `EDITOR`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start server in production mode |
| `npm run dev` | Start server in development mode with auto-reload |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:migrate:prod` | Deploy migrations in production |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:seed` | Run database seed script |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `COOKIE_SECRET` | Secret for cookie signing | Required (min 32 chars) |
| `JWT_ACCESS_SECRET` | JWT access token signing secret | Required (min 32 chars) |
| `JWT_REFRESH_SECRET` | JWT refresh token signing secret | Required (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Optional |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | Optional |
| `LOG_LEVEL` | Logging level | `info` |

## User Module

### Profile Management

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/users/me` | Required | Returns full profile including preferences |
| `PATCH /api/v1/users/me` | Required | Update fullName, username, bio |
| `DELETE /api/v1/users/me` | Required | Soft delete account (sets `deletedAt`, clears refreshToken) |
| `GET /api/v1/users/:username` | No | Returns public profile (safe fields only) |
| `GET /api/v1/users/check-username/:username` | No | Check if username is available |

### Password Change

- Requires `currentPassword`, `newPassword`, `confirmPassword`
- Validates current password before update
- Hashes new password with bcrypt (12 rounds)
- Invalidates all refresh tokens on password change (forces re-login)
- Not allowed for OAuth accounts

### Account Deletion (Soft Delete)

- Sets `deletedAt` timestamp instead of hard delete
- Clears refresh token to invalidate sessions
- Public profile returns 404 after deletion
- Deletion is currently irreversible via API (admin recovery can be built later)

### User Preferences

Default preferences created on first access:

| Field | Default | Description |
|-------|---------|-------------|
| `theme` | `dark` | UI theme (dark/light) |
| `language` | `en` | UI language |
| `timezone` | `UTC` | User timezone |
| `editorFontSize` | `14` | Editor font size in px |
| `editorTabSize` | `2` | Editor tab size |
| `editorWordWrap` | `false` | Enable word wrap |
| `editorMinimap` | `true` | Show minimap |

### Avatar Storage (Architecture)

Avatar upload uses a storage abstraction layer with two providers:

- **LocalStorageProvider** — Stores locally under `/uploads/avatars/` (development)
- **CloudStorageProvider** — Placeholder for Cloudinary, AWS S3, etc. (production)

Switch providers by extending the `StorageService` class. No controller binding yet — ready for frontend integration.

### Username Rules

- 3–30 characters
- Letters, numbers, and underscores only
- Lowercase enforced
- Reserved usernames blocked: admin, root, system, api, nexide, etc.

## Project Module

### Database Model

```
Project
├── id          (UUID, primary key)
├── name        (string, required)
├── slug        (string, unique per owner)
├── description (varchar 1000, optional)
├── icon        (string, optional)
├── color       (hex #RRGGBB, optional)
├── language    (string, default: "javascript")
├── framework   (string, optional)
├── visibility  (enum: PRIVATE | PUBLIC | UNLISTED)
├── status      (enum: ACTIVE | ARCHIVED | DELETED)
├── ownerId     (UUID, FK -> users.id)
├── lastOpenedAt (datetime, tracks recents)
├── deletedAt   (datetime, soft delete)
└── timestamps  (createdAt, updatedAt)

UserFavorite
├── userId     (UUID, composite PK)
├── projectId  (UUID, composite PK)
└── createdAt  (datetime)
```

### Project Status

| Status | Description |
|--------|-------------|
| `ACTIVE` | Normal operational state |
| `ARCHIVED` | Hidden from default views, can be restored |
| `DELETED` | Soft deleted (softDelete sets status + deletedAt) |

### Visibility

| Visibility | Description |
|------------|-------------|
| `PRIVATE` | Only owner and invited members can see |
| `PUBLIC` | Anyone can view |
| `UNLISTED` | Accessible via direct link only (future) |

### Project CRUD

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/projects` | POST | Required | Create project (validates name, auto-generates slug) |
| `/projects` | GET | Required | List projects with search, filter, pagination |
| `/projects/:id` | GET | Required | Get project by ID (owner only) |
| `/projects/:id` | PATCH | Required | Update project fields |
| `/projects/:id` | DELETE | Required | Soft delete (status → DELETED) |
| `/projects/:id/permanent` | DELETE | Required | Permanent delete (owner only) |
| `/projects/:id/archive` | PATCH | Required | Archive (status → ARCHIVED) |
| `/projects/:id/restore` | PATCH | Required | Restore (status → ACTIVE) |
| `/projects/:id/duplicate` | POST | Required | Duplicate project with "(Copy)" suffix |
| `/projects/:id/open` | POST | Required | Track last opened timestamp |

### Favorites

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects/favorites` | GET | List favorited projects |
| `/projects/:id/favorite` | POST | Add to favorites |
| `/projects/:id/favorite` | DELETE | Remove from favorites |

### Slug System

- Auto-generated from project name (slugify)
- Unique per owner (`@@unique([ownerId, slug])`)
- Collision-safe: appends timestamp when slug exists
- Check availability: `GET /projects/check-slug/:slug`

### Search & Filtering

Query parameters for `GET /projects`:

| Param | Type | Example |
|-------|------|---------|
| `search` | string | `?search=api` |
| `language` | string | `?language=typescript` |
| `status` | enum | `?status=ACTIVE` |
| `visibility` | enum | `?visibility=PRIVATE` |
| `sort` | string | `?sort=-updatedAt` (prefix `-` for desc) |
| `page` | int | `?page=1` |
| `limit` | int | `?limit=20` (max 50) |

### Security

- All project routes require authentication
- Owner validation on every project access
- IDOR protection: users can only access their own projects
- UUID validation on project ID parameters
- Zod validation on all inputs
- Soft delete prevents data loss

## Workspace & Team Module

### Database Models

```
Workspace
├── id          (UUID)
├── projectId   (UUID, unique FK -> projects.id)
├── name        (string)
├── status      (string, default: "active")
└── timestamps

ProjectMember
├── id          (UUID)
├── projectId   (UUID, FK -> projects.id)
├── userId      (UUID, FK -> users.id)
├── role        (enum: OWNER | ADMIN | EDITOR | VIEWER)
├── joinedAt    (datetime)
├── invitedBy   (UUID, FK -> users.id, nullable)
└── @@unique([projectId, userId])

Invitation
├── id          (UUID)
├── projectId   (UUID, FK -> projects.id)
├── email       (string)
├── role        (enum)
├── token       (string, unique)
├── status      (enum: PENDING | ACCEPTED | REJECTED | EXPIRED)
├── invitedBy   (UUID, FK)
├── acceptedBy  (UUID, FK, nullable)
├── expiresAt   (datetime, 7 days from creation)
└── timestamps
```

### Auto-Creation

When a project is created, the system automatically:
1. Creates a `Workspace` linked to the project
2. Adds the creator as a `ProjectMember` with `OWNER` role

### Permission Hierarchy

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access, transfer ownership, delete project, manage all members |
| **ADMIN** | Invite/remove members, manage workspace, change roles (except OWNER) |
| **EDITOR** | Edit project files and settings, cannot manage members |
| **VIEWER** | Read-only access to project |

### Invitation Flow

1. Owner/Admin sends invite to email → creates `Invitation` with secure random token (32 bytes hex)
2. Invitation expires after 7 days
3. Recipient calls `POST /invitations/:token/accept` → added as `ProjectMember`
4. Duplicate pending invites blocked
5. Already-member emails blocked
6. Expired invitations auto-detected and rejected

### API Endpoints

| Endpoint | Method | Auth | Role Required |
|----------|--------|------|---------------|
| `/projects/:id/workspace` | GET | Required | Any member |
| `/projects/:id/workspace` | PATCH | Required | OWNER, ADMIN |
| `/projects/:id/members` | GET | Required | Any member |
| `/projects/:id/members/invite` | POST | Required | OWNER, ADMIN |
| `/projects/:id/members/:mid/role` | PATCH | Required | OWNER, ADMIN |
| `/projects/:id/members/:mid` | DELETE | Required | OWNER, ADMIN |
| `/invitations/:token/accept` | POST | Required | Invited user |
| `/invitations/:token/reject` | POST | Required | Invited user |

### Security Rules

- All workspace/member routes require authentication
- Every action verifies project membership before execution
- Only OWNER/ADMIN can manage members
- Users cannot change their own role
- OWNER role cannot be changed or removed
- Admins cannot remove other admins
- Role escalation prevented (ADMIN cannot set OWNER)
- Invitation tokens are cryptographically random (32 bytes)
- Duplicate pending invitations rejected
- Existing members cannot be re-invited

## File System Module

### Database Models

```
Folder
├── id          (UUID)
├── name        (string)
├── path        (string, unique per project)
├── projectId   (UUID, FK)
├── parentId    (UUID, self-referencing FK, nullable)
├── children    (Folder[], self-referencing)
├── files       (File[])
└── timestamps

File
├── id          (UUID)
├── name        (string)
├── extension   (string, parsed from name)
├── path        (string, unique per project)
├── content     (text, nullable)
├── size        (int, bytes)
├── mimeType    (string, nullable)
├── encoding    (string, default: utf-8)
├── projectId   (UUID, FK)
├── folderId    (UUID, FK, nullable)
└── timestamps
```

### Path System

- Paths are auto-generated from folder hierarchy (e.g., `src/components/Button.tsx`)
- Each project has unique paths for both files and folders
- Moving/renaming updates the path accordingly

### Folder Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects/:id/folders` | POST | Create folder (supports nested via parentId) |
| `/projects/:id/folders/:fid/rename` | PATCH | Rename folder (updates child paths) |
| `/projects/:id/folders/:fid` | DELETE | Delete folder and all descendants recursively |

### File Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects/:id/files/tree` | GET | Fetch all files and folders flat (for building tree UI) |
| `/projects/:id/files` | POST | Create file with optional content |
| `/projects/:id/files/:fid` | GET | Get file content |
| `/projects/:id/files/:fid` | PUT | Update file content and name |
| `/projects/:id/files/:fid/rename` | PATCH | Rename file |
| `/projects/:id/files/:fid` | DELETE | Delete file |

### Permission Model

| Role | Read tree/files | Create/Update/Delete |
|------|----------------|---------------------|
| OWNER | ✓ | ✓ |
| ADMIN | ✓ | ✓ |
| EDITOR | ✓ | ✓ |
| VIEWER | ✓ | ✗ |

### Recursive Folder Deletion

When a folder is deleted:
1. All descendant folders are discovered via BFS
2. All files within those folders are deleted first
3. Folders are deleted in reverse order (leaves → root)
4. Single transaction-like behavior (soft delete not implemented — use project archive for recovery)

## Security

- Helmet for secure HTTP headers
- CORS with whitelist configuration
- Rate limiting on all routes (100/15min), auth routes (20/15min)
- Request size limits (10MB)
- Environment variable validation at startup
- Passwords hashed with bcrypt (12 rounds)
- JWT with access + refresh token pattern
- Refresh token rotation (old token invalidated on refresh)
- HttpOnly, Secure, SameSite cookies
- Generic auth error messages (don't reveal if email exists)
- No stack traces exposed in production
- Graceful shutdown handling
- SQL injection prevention via Prisma parameterized queries
- XSS protection via Helmet

## Middleware

| Middleware | Description |
|-----------|-------------|
| `authenticate` | Verifies JWT access token, attaches `req.user` |
| `authorize(...roles)` | Restricts access to specified roles |
| `authorizeSelf(paramName)` | Allows OWNER/ADMIN or the resource owner |
| `validate(schema, source)` | Validates request body/params/query with Zod |

## Architecture

The project follows Clean Architecture principles with clear separation of concerns:

- **Controllers** handle HTTP requests/responses
- **Services** contain business logic
- **Repositories** handle database operations
- **Middlewares** process requests before controllers
- **Validators** ensure data integrity
- **Config** centralizes application configuration

## License

MIT
