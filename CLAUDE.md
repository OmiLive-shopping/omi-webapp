# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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