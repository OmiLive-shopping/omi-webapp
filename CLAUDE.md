# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Management with Task Master

When working on tasks in this repository, use the Task Master MCP (Model Context Protocol) tools for task tracking and management. Task Master provides:
- Structured task tracking with `.taskmaster/tasks/tasks.json`
- Subtask generation and dependency management
- Progress tracking and status updates
- AI-powered task generation from PRDs

### Default Workflow
1. **For new features/tasks**: Use `mcp__taskmaster-ai__parse_prd` if a PRD exists, or `mcp__taskmaster-ai__add_task` for individual tasks
2. **Track progress**: Use `mcp__taskmaster-ai__set_task_status` to update task status as you work
3. **View tasks**: Use `mcp__taskmaster-ai__get_tasks` to see current tasks and their status
4. **Find next task**: Use `mcp__taskmaster-ai__next_task` to identify what to work on next based on dependencies

Always default to using Task Master MCP tools when instructed to work on tasks or when implementing features from a specification.

### Phase Completion Workflow
When all tasks in a phase are completed:
1. **Backup completed tasks**: Copy `tasks.json` to `task-backup.json`
   ```bash
   cp .taskmaster/tasks/tasks.json .taskmaster/tasks/task-backup.json
   ```
2. **Archive phase tasks**: Create a phase-specific backup
   ```bash
   cp .taskmaster/tasks/tasks.json .taskmaster/tasks/phase-X-completed.json
   ```
3. **Clear for next phase**: Either keep completed tasks for reference or start fresh
4. **Document phase completion**: Update `.taskmaster/docs/` with phase summary

This preserves task history while keeping the active task list manageable for the next phase.

## Documentation Update Workflow

After completing a major task (marked as "done" in Task Master), update documentation to maintain context for future LLM sessions:

### 1. Update `.taskmaster/docs/` (Project-specific documentation)
Create or update files in `.taskmaster/docs/` with:
- **implementation-notes.md**: Technical decisions, architecture patterns used, and rationale
- **api-changes.md**: New endpoints, modified contracts, breaking changes
- **schema-updates.md**: Database schema changes, migration notes
- **dependencies.md**: New libraries added, version upgrades, security considerations

Example structure for quick LLM parsing:
```markdown
## Feature: [Task Title] - [Date]
### What Changed
- Bullet points of key changes
### Technical Details
- Implementation approach
- Files modified: path/to/file.ts:123
### Dependencies
- New packages: package@version (reason)
### Testing
- Test coverage: path/to/test.spec.ts
```

### 2. Update CLAUDE.md (LLM instruction file)
After major milestones, update this file with:
- New architectural patterns established
- Updated command workflows
- New environment variables or configuration
- Common troubleshooting scenarios discovered
- Performance considerations or limitations

Keep updates concise and actionable - focus on "what an LLM needs to know" rather than detailed documentation.

## Repository Overview

This is a full-stack TypeScript monorepo containing:
- **Backend**: Express.js API with Prisma ORM and PostgreSQL
- **Frontend**: React application with Vite and Tailwind CSS

## Common Development Commands

### Backend (in `/backend` directory)
```bash
# Install dependencies
npm install

# Database setup (first time)
npx prisma generate
npx prisma migrate dev

# Development
npm run dev              # Start dev server with hot reload

# Testing
npm run test            # Run tests in watch mode
npm run test:ci         # Run tests once

# Build & Production
npm run build           # Lint, format, test, then build
npm run start           # Start production server

# Code Quality
npm run lint            # Check linting
npm run lint:fix        # Fix linting issues
npm run format          # Format code with Prettier
```

### Frontend (in `/frontend` directory)
```bash
# Install dependencies (use pnpm for Husky hooks)
pnpm install

# Development
pnpm dev               # Start dev server on http://localhost:5173

# Build
pnpm build             # TypeScript check + production build
pnpm preview           # Preview production build

# Code Quality
pnpm lint              # Check linting
pnpm lint:fix          # Fix linting issues
pnpm format            # Format code with Prettier
pnpm typecheck         # TypeScript type checking
```

## Architecture & Code Structure

### Backend Architecture
The backend follows a **feature-based modular architecture** where each feature contains:
- **controllers/**: HTTP request handlers
- **services/**: Business logic (framework-agnostic)
- **repositories/**: Database interactions via Prisma
- **routes/**: API endpoint definitions
- **schemas/**: Zod validation schemas
- **types/**: TypeScript interfaces
- **__tests__/**: Vitest unit tests

Example: The `user` feature at `/backend/src/features/user/` demonstrates this pattern.

Key middleware:
- **api-error.middleware.ts**: Centralized error handling
- **auth.middleware.ts**: JWT authentication
- **validation.middleware.ts**: Request validation using Zod
- **security.middleware.ts**: Rate limiting and host whitelisting

### Frontend Architecture
- React components in `/frontend/src/components/`
- Absolute imports configured with `@/` prefix
- Tailwind CSS for styling
- Dark/light theme support via `useTheme` hook

## Database Schema
PostgreSQL database with Prisma ORM. Main models:
- **User**: Contains authentication fields and profile data
- **Roles**: User role management

Always run `npx prisma generate` after schema changes.

## Environment Configuration
Backend requires `.env.dev` file with:
- `DATABASE_URL`: PostgreSQL connection string
- `SHADOW_DATABASE_URL`: Shadow database for Prisma migrations
- Additional env vars validated in `/backend/src/config/env-schema.ts`

## API Routes
Base API path: `/v1`
- `/v1/users`: User management endpoints

## Testing Approach
- Backend: Vitest with Supertest for API testing
- Test files follow `*.spec.ts` naming convention
- Run individual tests with: `npm run test -- path/to/test.spec.ts`

## Security Considerations
- JWT authentication implemented
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Helmet.js for security headers
- Host whitelisting available via `WHITE_LIST_URLS` env var

## Prisma Migration Notes
Claude Code's environment is non-interactive (no TTY), which prevents using `prisma migrate dev`. Alternative approaches:
- **Development**: Use `npx prisma db push` to sync schema changes directly
- **Production**: Use `npx prisma migrate deploy` to apply existing migrations
- **Generate SQL**: Use `npx prisma migrate diff` to create migration SQL manually
- After schema changes: Always run `npx prisma generate` to update the client