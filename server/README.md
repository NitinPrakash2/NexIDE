# NexIDE Server

Collaborative Cloud IDE - Backend Server

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** Neon PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Logging:** Winston + Morgan
- **Security:** Helmet, CORS, Rate Limiting

## Project Structure

```
server/
├── src/
│   ├── config/         # Configuration files (env, cors, logger, rateLimiter)
│   ├── constants/      # Application constants
│   ├── controllers/    # Route handlers
│   ├── services/       # Business logic layer
│   ├── repositories/   # Database access layer
│   ├── routes/         # API route definitions
│   ├── middlewares/     # Express middlewares
│   ├── validators/     # Zod validation schemas
│   ├── helpers/        # Helper utilities
│   ├── utils/          # Reusable utilities
│   ├── lib/            # Third-party client initialization
│   ├── prisma/         # Prisma-specific code
│   ├── logs/           # Log files
│   ├── app.js          # Express app configuration
│   └── server.js       # Server entry point
├── prisma/
│   └── schema.prisma   # Database schema
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
   - Adjust other settings as needed

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

Returns server health status, uptime, memory usage, and environment information.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start server in production mode |
| `npm run dev` | Start server in development mode with auto-reload |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
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
| `LOG_LEVEL` | Logging level | `info` |

## Security

- Helmet for secure HTTP headers
- CORS with whitelist configuration
- Rate limiting on all routes
- Request size limits (10MB)
- Environment variable validation at startup
- No stack traces exposed in production
- Graceful shutdown handling

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
