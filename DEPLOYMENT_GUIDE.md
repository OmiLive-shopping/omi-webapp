# 🚀 Production Deployment Guide

This guide explains how to deploy changes to the Omi Live production environment.

## 📋 Quick Overview

- **Frontend**: Firebase Hosting (`https://app.omiliveshopping.com`)
- **Backend**: Google Cloud Run (`omi-backend` service in `us-central1`)
- **Database**: Cloud SQL PostgreSQL
- **Project ID**: `omi-live-backend`

---

## 🎨 Frontend Deployment (Firebase Hosting)

### Prerequisites
- **pnpm** installed: `npm install -g pnpm`
- **Firebase CLI** installed: `npm install -g firebase-tools`
- Authenticated: `firebase login`

### Quick Deploy (Using Script)

```bash
cd frontend
./deploy.sh
```

### Manual Step-by-Step Deployment

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies** (if needed):
   ```bash
   pnpm install
   ```

3. **Build the production bundle**:
   ```bash
   pnpm build
   ```
   This creates an optimized build in the `dist/` folder.

4. **Deploy to Firebase Hosting**:
   ```bash
   firebase use omi-live-backend
   firebase deploy --only hosting
   ```

5. **Verify deployment**:
   - Visit: `https://app.omiliveshopping.com`
   - Try logging in with: admin@omi.live / password123
   - Check browser console for errors

### ⚡ Quick Frontend Deploy Commands
```bash
# Using deployment script (recommended)
cd frontend && ./deploy.sh

# Manual one-liner
cd frontend && pnpm build && firebase deploy --only hosting
```

### 🔧 Frontend Environment Variables
Frontend uses **same-domain architecture** via Firebase rewrites. No VITE_SERVER_URL needed!

`.env.production`:
```env
# Leave VITE_SERVER_URL empty for same-domain (Firebase rewrite)
VITE_SERVER_URL=
VITE_API_BASE=/v1
```

**How it works**: Firebase proxies `/api/**` requests to Cloud Run backend via `firebase.json` rewrites, so frontend calls like `/api/v1/auth/...` are same-origin and cookies work perfectly.

---

## ⚙️ Backend Deployment (Google Cloud Run)

### Prerequisites
- **Google Cloud SDK** installed: `gcloud auth login`
- Project set: `gcloud config set project omi-live-backend`
- Secrets configured in GCP Secret Manager (see below)

### Quick Deploy (Using Script)

```bash
cd backend
./deploy.sh
```

### Manual Step-by-Step Deployment

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies** (if needed):
   ```bash
   npm install
   ```

3. **Build TypeScript** (using relaxed config to bypass type errors):
   ```bash
   rm -rf dist
   tsc --project tsconfig.build.json
   tsc-alias --project tsconfig.build.json
   npx prisma generate
   ```

4. **Deploy to Cloud Run** (using source deployment):
   ```bash
   gcloud run deploy omi-backend \
     --source . \
     --region=us-central1 \
     --platform=managed \
     --allow-unauthenticated \
     --memory=512Mi \
     --cpu=1 \
     --min-instances=0 \
     --max-instances=10 \
     --timeout=300 \
     --set-env-vars="NODE_ENV=production,CLIENT_URL=https://app.omiliveshopping.com,BETTER_AUTH_URL=https://app.omiliveshopping.com" \
     --set-secrets="DATABASE_URL=DATABASE_URL:latest,BETTER_AUTH_SECRET=BETTER_AUTH_SECRET:latest" \
     --port=8080
   ```

5. **Verify deployment**:
   ```bash
   # Test health endpoint
   curl https://omi-backend-355024965259.us-central1.run.app/health

   # Test auth endpoint (via Firebase proxy)
   curl https://app.omiliveshopping.com/api/v1/auth/get-session
   ```

### ⚡ Quick Backend Deploy Command
```bash
# Using deployment script (recommended)
cd backend && ./deploy.sh
```

### 🔑 Backend Environment Variables & Secrets

**Secrets** (stored in Google Secret Manager):
- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Better Auth encryption secret (32+ characters)

**How to create secrets**:
```bash
# DATABASE_URL
echo -n "postgresql://user:pass@host:5432/dbname" | \
  gcloud secrets create DATABASE_URL --data-file=-

# BETTER_AUTH_SECRET
openssl rand -hex 32 | \
  gcloud secrets create BETTER_AUTH_SECRET --data-file=-
```

**Environment Variables** (set during deployment):
- `NODE_ENV=production`
- `CLIENT_URL=https://app.omiliveshopping.com` (for CORS)
- `BETTER_AUTH_URL=https://app.omiliveshopping.com` (for Better Auth)
- `PORT=8080` (automatically set by Cloud Run)

---

## 🗄️ Database Management

### Running Migrations

1. **Start Cloud SQL Proxy** (in a separate terminal):
   ```bash
   cloud-sql-proxy omi-live-backend:us-central1:omi-live-db --port 5433
   ```

2. **Run migrations**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

3. **Generate Prisma client** (if schema changed):
   ```bash
   npx prisma generate
   ```

### Seeding Database
```bash
cd backend
npx prisma db seed
```

### Prisma Studio (Database Admin)
```bash
cd backend
npx prisma studio --port 5558
```

---

## 🔄 Full Deployment Workflow

### For Code Changes (No DB Changes)
```bash
# 1. Deploy Backend
cd backend
gcloud builds submit --tag us-central1-docker.pkg.dev/omi-live-backend/omi-backend/omi-backend:latest
gcloud run deploy omi-backend --image us-central1-docker.pkg.dev/omi-live-backend/omi-backend/omi-backend:latest --platform managed --region us-central1

# 2. Deploy Frontend
cd ../frontend
npm run build
firebase deploy --only hosting
```

### When Do I Deploy Frontend vs Backend?

- Frontend-only changes (UI, routing, static assets, `.env.production` values used by FE):
  - Deploy frontend only.
- Backend/API changes (routes, auth behavior, CORS, environment variables/secrets, database logic):
  - Deploy backend. If FE assets changed or FE env values changed, deploy frontend too.
- Auth/cookie persistence fixes:
  - Prefer same-origin FE calls (no backend change needed). If you modified backend CORS or auth config, deploy backend.

With same-origin enabled (using Firebase rewrites), most auth-related FE updates are frontend-only deploys.

### For Database Schema Changes
```bash
# 1. Start Cloud SQL Proxy
cloud-sql-proxy omi-live-backend:us-central1:omi-live-db --port 5433 &

# 2. Run migrations
cd backend
npx prisma migrate deploy
npx prisma generate

# 3. Deploy backend with new schema
gcloud builds submit --tag us-central1-docker.pkg.dev/omi-live-backend/omi-backend/omi-backend:latest
gcloud run deploy omi-backend --image us-central1-docker.pkg.dev/omi-live-backend/omi-backend/omi-backend:latest --platform managed --region us-central1

# 4. Deploy frontend
cd ../frontend
npm run build
firebase deploy --only hosting
```

---

## 🚨 Troubleshooting

### Frontend Issues
- **Build fails**: Check TypeScript errors with `npm run build:with-typecheck`
- **Environment variables**: Verify `.env.production` file
- **Firebase deployment fails**: Check `firebase.json` configuration
- **Auth not persisting**: Ensure production FE calls are same-origin (e.g., `/api/v1/...`) and that `VITE_SERVER_URL` is not set in `.env.production`.

### Backend Issues
- **Container fails to start**: Check Cloud Run logs with `gcloud logging read "resource.type=cloud_run_revision" --limit 50`
- **Database connection fails**: Verify Cloud SQL instance is attached and secrets are set
- **CORS errors**: Check `WHITE_LIST_URLS` environment variable
  - For same-origin via Firebase Hosting, most FE calls won’t need CORS. If you call the backend from other origins (e.g., dev tools, third-party dashboards), add those origins to `WHITE_LIST_URLS`.

### Database Issues
- **Migration fails**: Ensure Cloud SQL Proxy is running on port 5433
- **Connection refused**: Check if Cloud SQL instance is running and accessible

---

## 📊 Monitoring & Logs

### Cloud Run Logs
```bash
# Real-time logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-backend" --follow

# Recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-backend" --limit 50
```

### Firebase Hosting Logs
```bash
firebase hosting:channel:list
```

### Health Checks
- **Frontend**: `https://app.omiliveshopping.com`
- **Backend Direct**: `https://omi-backend-355024965259.us-central1.run.app/health`
- **API (via Firebase proxy)**: `https://app.omiliveshopping.com/api/v1/auth`

---

## 🎯 Quick Reference

| Service | URL | Deploy Command |
|---------|-----|----------------|
| Frontend | `https://app.omiliveshopping.com` | `cd frontend && ./deploy.sh` |
| Backend | `https://omi-backend-355024965259.us-central1.run.app` | `cd backend && ./deploy.sh` |
| Auth (public) | `https://app.omiliveshopping.com/api/v1/auth` | - |

**Project ID**: `omi-live-backend`
**Region**: `us-central1`
**Cloud Run Service**: `omi-backend`
**Firebase Site**: `app.omiliveshopping.com`

---

## 🚨 Common Issues & Fixes

### Issue: "Endpoint not found" on `/api/v1/auth/*`
**Solution**: Backend's Better Auth baseURL is wrong. Should be `https://app.omiliveshopping.com`, not Cloud Run URL.
```bash
cd backend && ./deploy.sh  # Script sets correct BETTER_AUTH_URL
```

### Issue: CORS errors in browser
**Solution**: Set CLIENT_URL environment variable.
```bash
gcloud run services update omi-backend \
  --region=us-central1 \
  --set-env-vars="CLIENT_URL=https://app.omiliveshopping.com"
```

### Issue: 404 on all `/api/**` requests
**Solution**: Firebase rewrite not configured or not deployed.
```bash
cd frontend && firebase deploy --only hosting
```

### Issue: Cookies not persisting / Login doesn't stick
**Solution**: You're in same-domain mode, cookies should work. Check:
1. Frontend uses empty `VITE_SERVER_URL` (not set in `.env.production`)
2. Firebase `firebase.json` has `/api/**` rewrite configured
3. Backend `trustedOrigins` includes `https://app.omiliveshopping.com`

---

*Last updated: October 2025*
