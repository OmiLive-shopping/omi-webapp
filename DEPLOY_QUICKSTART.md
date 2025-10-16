# 🚀 Quick Deploy Guide

## TL;DR - Deploy Everything

```bash
# 1. Deploy Backend (with auth fix)
cd backend && ./deploy.sh

# 2. Deploy Frontend
cd ../frontend && ./deploy.sh

# 3. Test
curl https://app.omiliveshopping.com/api/v1/auth/get-session
```

## What's Fixed?

✅ Better Auth now uses `https://app.omiliveshopping.com` as baseURL
✅ Firebase rewrites `/api/**` to Cloud Run backend
✅ Same-domain = cookies work perfectly
✅ Deployment scripts skip type errors using `tsconfig.build.json`

## Architecture

```
User Browser
    ↓
https://app.omiliveshopping.com (Firebase Hosting)
    ↓ /api/** requests
Cloud Run Backend (omi-backend)
    ↓
PostgreSQL Database
```

## Environment Variables

### Backend (Cloud Run)
- `NODE_ENV=production`
- `CLIENT_URL=https://app.omiliveshopping.com`
- `BETTER_AUTH_URL=https://app.omiliveshopping.com`
- `DATABASE_URL` (from Secret Manager)
- `BETTER_AUTH_SECRET` (from Secret Manager)

### Frontend (Firebase)
- `VITE_SERVER_URL=` (empty! Uses same-domain)
- `VITE_API_BASE=/v1`

## Test Credentials

- **Email**: admin@omi.live
- **Password**: password123

## Deployment Scripts

Both scripts are **executable** and handle everything:

### `backend/deploy.sh`
- Validates environment
- Builds TypeScript (relaxed config)
- Generates Prisma client
- Deploys to Cloud Run
- Sets correct env vars

### `frontend/deploy.sh`
- Installs dependencies (pnpm)
- Builds production bundle
- Verifies Firebase config
- Deploys to Firebase Hosting

## Common Commands

```bash
# View backend logs
gcloud run services logs tail omi-backend --region=us-central1

# Test health
curl https://omi-backend-355024965259.us-central1.run.app/health

# Test auth (via proxy)
curl https://app.omiliveshopping.com/api/v1/auth/get-session

# Rollback backend
gcloud run services update-traffic omi-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100

# Rollback frontend
firebase hosting:rollback
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 404 on `/api/v1/auth/*` | Redeploy backend: `cd backend && ./deploy.sh` |
| CORS errors | Check CLIENT_URL is set in Cloud Run |
| Type errors during build | Scripts use `tsconfig.build.json` (relaxed) |
| Secrets not found | Create them: `gcloud secrets create DATABASE_URL --data-file=-` |

## Next Steps After Deploy

1. ✅ Visit https://app.omiliveshopping.com
2. ✅ Login with admin@omi.live / password123
3. ✅ Check browser console (should be no errors)
4. ✅ Test creating a stream
5. ✅ Test products page

---

**Full Guide**: See `DEPLOYMENT_GUIDE.md` for detailed documentation.
