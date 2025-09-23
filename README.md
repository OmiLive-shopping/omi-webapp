# OMI Live - Full Stack Live Streaming Platform

> **A modern, visual-first live commerce platform built with TypeScript, React, and zero-cost WebRTC streaming**

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-blue.svg)](https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/socket.io-4.8%2B-green.svg)](https://socket.io/)

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **PostgreSQL** 15+ (Docker recommended)
- **pnpm** (for frontend)
- **npm** (for backend)

### 1. Clone & Install
```bash
git clone <repository-url>
cd omi-webapp

# Install all dependencies
npm run install:all
```

### 2. Environment Configuration

#### Backend Environment Setup (.env)
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

**Example `.env` file** (replace with your actual values):
```env
# Server Configuration
NODE_ENV=development
PORT=9000
LOG_LEVEL=debug

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
SHADOW_DATABASE_URL="postgresql://username:password@localhost:5432/shadow_database_name"

# Authentication (generate your own secrets - min 32 chars)
JWT_SECRET=replace-with-your-own-secret-key-min-32-chars
JWT_REFRESH_SECRET=replace-with-your-own-refresh-secret
BETTER_AUTH_SECRET=replace-with-your-own-better-auth-secret

# CORS Configuration (comma-separated URLs)
WHITE_LIST_URLS=http://localhost:8888,http://localhost:5173

# Optional: Redis (if using session management)
REDIS_URL=redis://localhost:6379

# Optional: API Security
API_KEY_HEADER=x-api-key
API_KEY_VALUE=your-secure-api-key-here

# Optional: Socket.IO Admin UI
SOCKET_ADMIN_USERNAME=admin
SOCKET_ADMIN_PASSWORD=change-this-password
```

#### Frontend Environment Setup (.env.development)
```bash
cd frontend
cp .env.example .env.development
# Edit .env.development for local development
```

**Example `.env.development` file**:
```env
# Backend API URL (adjust port if needed)
VITE_API_URL=http://localhost:9000
VITE_API_BASE_PATH=/v1

# WebSocket URL
VITE_SOCKET_URL=ws://localhost:9000

# Optional: VDO.ninja Configuration
VITE_VDO_ROOM_PASSWORD=optional-room-password
```

**Example `.env.production` file** (for deployment):
```env
# Replace with your actual production URLs
VITE_API_URL=https://your-api-domain.com
VITE_API_BASE_PATH=/v1
VITE_SOCKET_URL=wss://your-api-domain.com
```

### 3. Database Setup
```bash
# Start PostgreSQL (example using Docker)
docker run --name omi-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=dev_db \
  -p 5432:5432 \
  -d postgres:15

# Create shadow database (required for Prisma migrations)
docker exec omi-postgres psql -U postgres -c "CREATE DATABASE dev_db_shadow;"

# Backend database setup
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed  # Seeds with test data (see credentials below)
```

### 3. Start Development
```bash
# Root directory - starts both backend and frontend
npm run dev

# Or individually:
npm run dev:backend   # Backend on http://localhost:3000
npm run dev:frontend  # Frontend on http://localhost:5173
```

### 4. Verify Setup
- **Frontend**: http://localhost:5173 (or port 8888 if configured)
- **Backend API**: http://localhost:9000/v1
- **Database Studio**: `npx prisma studio` (from backend directory)
- **WebSocket Test**: http://localhost:5173/debug/websocket-test
- **Socket.IO Admin**: http://localhost:9000/admin (if configured)

### Test Credentials (After Seeding)
```
Admin User:
- Email: admin@omi.live
- Password: password123

Regular Users:
- Email: john@example.com, jane@example.com, streamer@example.com
- Password: password123
```

### Important Environment Notes

⚠️ **Security Notes**:
- Never commit `.env` files to git (they're in .gitignore)
- Generate unique secrets for production (use `openssl rand -hex 32`)
- JWT secrets must be at least 32 characters long
- Change all default passwords before deployment

📝 **Configuration Tips**:
- Backend uses `.env` file (not `.env.development` or `.env.dev`)
- Frontend uses `.env.development` for local dev, `.env.production` for builds
- Prisma automatically loads `.env` from backend directory
- All URLs in WHITE_LIST_URLS must be comma-separated without spaces

---

## 🏗️ Architecture Overview

### Technology Stack

**Frontend (React + TypeScript)**
- **React** 18.2 with TypeScript 5.0.2
- **Vite** 4.3.9 for fast development and building
- **Tailwind CSS** 3.3.2 (NO component libraries - pure Tailwind only)
- **Zustand** for client state management
- **TanStack Query** for server state management
- **Socket.IO Client** for real-time features
- **Lucide React** for icons

**Backend (Express + TypeScript)**
- **Express.js** 4.21.2 with TypeScript 5.8.2
- **Prisma ORM** 6.4.1 with PostgreSQL
- **Socket.IO** 4.8.1 for real-time WebSocket communication
- **JWT Authentication** with bcrypt password hashing
- **Zod** for request/response validation
- **Vitest** for testing

**Streaming Infrastructure**
- **VDO.ninja** integration for zero-cost WebRTC streaming
- **OBS Studio** compatibility for professional streaming
- **Real-time chat** and viewer management

### Template Sources

This project was built using proven starter templates as foundations:

- **Frontend**: Based on [aulianza/vite-react-starter](https://github.com/aulianza/vite-react-starter) - A well-configured Vite + React + TypeScript + Tailwind CSS starter template
- **Backend**: Based on [sushantrahate/express-typescript-prisma-postgresql](https://github.com/sushantrahate/express-typescript-prisma-postgresql) - A robust Express + TypeScript + Prisma + PostgreSQL boilerplate

These templates provided excellent foundations with proper TypeScript configurations, linting, formatting, and testing setups, allowing the team to focus on building the core streaming and e-commerce features rather than initial project setup.

### Project Structure
```
omi-webapp/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── features/        # Feature-based modules
│   │   ├── middleware/      # Auth, validation, security
│   │   ├── socket/          # WebSocket handlers
│   │   └── config/          # Environment & database config
│   ├── prisma/              # Database schema & migrations
│   └── __tests__/           # Vitest test files
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route components
│   │   ├── lib/             # Utilities and integrations
│   │   └── hooks/           # Custom React hooks
│   └── e2e/                 # Playwright E2E tests
├── shared-types/            # Shared TypeScript interfaces
└── .taskmaster/             # Project management & documentation
```

---

## 📋 Development Commands

### Root Commands (Monorepo)
```bash
npm run dev              # Start both backend and frontend
npm run build            # Build both applications
npm run test             # Run all tests
npm run lint             # Lint all code
npm run format           # Format all code
npm run clean            # Clean node_modules and dist folders
```

### Backend Commands
```bash
cd backend
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm run start            # Start production server
npm run test             # Run tests in watch mode
npm run test:ci          # Run tests once
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier

# Database commands
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Generate Prisma client
npm run seed             # Seed database with test data
```

### Frontend Commands
```bash
cd frontend
pnpm dev                 # Start dev server (http://localhost:5173)
pnpm build               # Build for production
pnpm preview             # Preview production build
pnpm lint                # Check linting
pnpm lint:fix            # Fix linting issues
pnpm format              # Format code with Prettier
pnpm typecheck           # TypeScript type checking

# Testing commands
pnpm test                # Run unit tests
pnpm test:e2e            # Run Playwright E2E tests
pnpm test:websocket      # Run WebSocket-specific tests
pnpm test:vdo            # Run VDO.ninja integration tests
```

---

## 🎯 Key Features

### ✅ Completed Features

**Authentication & Security**
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Role-based access control (User, Streamer, Admin)
- Rate limiting and security headers
- Host whitelisting for production

**Real-time Communication**
- WebSocket integration with Socket.IO
- Real-time chat with message persistence
- Live stream viewer count updates
- Stream lifecycle events (start/stop/join/leave)
- **Note**: Security wrapper system removed due to data corruption issues - using direct handlers with Zod validation

**Database & API**
- PostgreSQL with Prisma ORM
- Type-safe database operations
- Comprehensive schema for users, streams, chat, products
- RESTful API with Zod validation
- Database migrations and seeding

**VDO.ninja Integration**
- Complete iframe API integration with 100+ commands
- Real-time event handling and state management
- Command queueing with priority levels
- Stream quality controls and media management
- Cross-browser compatibility testing

### 🚧 In Development

**Live Streaming Platform**
- Stream discovery and browsing
- Interactive stream viewing with chat
- Streamer studio interface
- Multi-user concurrent streaming

**E-commerce Integration**
- Product catalog and management
- Shopping cart and wishlist
- Order processing and history
- Live product showcasing during streams

---

## 🔧 Environment Configuration

### Backend Environment (.env.dev)
```bash
# Database
DATABASE_URL="postgresql://postgres:postgresql@localhost:5432/dev_db"
SHADOW_DATABASE_URL="postgresql://postgres:postgresql@localhost:5432/dev_db_shadow"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# Optional: Security
WHITE_LIST_URLS="http://localhost:5173,http://localhost:3000"
```

### Database Setup (Docker)
```bash
# Start PostgreSQL container
docker run --name omi-postgres \
  -e POSTGRES_PASSWORD=postgresql \
  -e POSTGRES_DB=dev_db \
  -p 5432:5432 \
  -d postgres:15

# Verify connection
docker exec -it omi-postgres psql -U postgres -d dev_db
```

---

## 🎨 UI Development Guidelines

### **CRITICAL: Tailwind CSS Only**
This project uses **pure Tailwind CSS** exclusively. **DO NOT** install or use any component libraries.

**✅ Correct Approach:**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Click Me
</button>
```

**❌ Wrong Approach:**
```tsx
<Button variant="primary">Click Me</Button>  // NO component libraries!
```

**Approved Technologies:**
- **Styling**: Tailwind CSS utility classes only
- **Icons**: Lucide React (`lucide-react`)
- **Conditional Classes**: `clsx` for dynamic class names
- **Dark Mode**: Tailwind's `dark:` prefix
- **Components**: Custom React components with Tailwind

---

## 🧪 Testing Strategy

### Backend Testing (Vitest + Supertest)
```bash
cd backend
npm run test              # Watch mode
npm run test:ci           # Single run
npm run test:detailed     # Verbose output
```

### Frontend Testing
```bash
cd frontend
pnpm test                 # Unit tests with Vitest
pnpm test:e2e             # Playwright E2E tests
pnpm test:websocket       # WebSocket functionality tests
pnpm test:vdo             # VDO.ninja integration tests
```

### WebSocket Testing
The project includes comprehensive WebSocket testing with a dedicated test page:
- **Test Page**: http://localhost:5173/debug/websocket-test
- **Features**: Stream joining, chat messaging, connection health monitoring
- **Status**: Core functionality verified and working

---

## 🚀 Deployment

### Production Build
```bash
# Build both applications
npm run build

# Backend production
cd backend
npm run start

# Frontend production
cd frontend
pnpm preview
```

### Database Migrations (Production)
```bash
cd backend
npx prisma migrate deploy    # Apply migrations
npx prisma generate          # Generate client
```

---

## 📚 Documentation & Task Management

### Task Master Integration
This project uses **Task Master AI** for development workflow management:

- **Task Tracking**: `.taskmaster/tasks/tasks.json`
- **Documentation**: `.taskmaster/docs/` contains comprehensive project docs
- **PRDs**: Product Requirements Documents for each development phase
- **Architecture Notes**: Technical decisions and implementation details

### Key Documentation Files
- **CLAUDE.md**: AI assistant instructions and development workflows
- **WEBSOCKET_TEST_FINDINGS.md**: WebSocket implementation analysis
- **DATABASE_SETUP.md**: Database configuration and troubleshooting
- **UI-STRATEGY-TAILWIND-ONLY.md**: UI development guidelines

---

## 🔍 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker ps | grep omi-postgres

# Restart container if needed
docker restart omi-postgres

# Verify connection
npx prisma db pull
```

**WebSocket Connection Issues**
- Ensure backend server is running on port 3000
- Check browser console for connection errors
- Visit the test page: http://localhost:5173/debug/websocket-test

**Frontend Build Errors**
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules
pnpm install

# Check TypeScript errors
pnpm typecheck
```

**Backend API Errors**
```bash
# Check logs
cd backend
npm run dev  # Watch for error messages

# Run tests to verify functionality
npm run test
```

### Development Tools
- **Database GUI**: `npx prisma studio` (from backend directory)
- **API Testing**: Use REST client with base URL `http://localhost:3000/v1`
- **WebSocket Testing**: Built-in test page at `/debug/websocket-test`
- **Logs**: Backend logs to console and files in `backend/logs/`

---

## 🤝 Contributing

### Development Workflow
1. **Clone** the repository and install dependencies
2. **Setup** PostgreSQL database and run migrations
3. **Start** development servers (`npm run dev`)
4. **Test** your changes with the provided test suites
5. **Follow** the Tailwind CSS-only UI guidelines
6. **Document** significant changes in `.taskmaster/docs/`

### Code Quality
- **TypeScript**: Full type safety required
- **Testing**: Write tests for new features
- **Linting**: Code must pass ESLint checks
- **Formatting**: Use Prettier for consistent formatting
- **Commits**: Follow conventional commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 Project Status

**Current Phase**: Integration of core streaming functionality with WebSocket communication

**Next Milestones**:
- Complete streamer studio interface
- Implement live stream discovery page
- Add real-time product showcasing
- Multi-user concurrent streaming testing

For detailed development progress and technical documentation, see the `.taskmaster/docs/` directory.

---

*Built with ❤️ by the OMI Live team*