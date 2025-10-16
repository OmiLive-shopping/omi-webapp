# 🚀 Production Environment Access Guide

## 🎯 Your Production Architecture

1. **Frontend**: `https://omi-live-backend.web.app/` (Firebase Hosting)
2. **Backend API**: `https://omi-live-backend-da2bnqrnoq-uc.a.run.app/` (Cloud Run)
3. **Database**: PostgreSQL (URL stored in Google Secrets)
4. **Project**: `omi-live-backend` (Google Cloud)

---

## 📊 Quick Access Dashboard Links

**Bookmark these links for instant access:**

### Google Cloud Console
- 🏠 **Main Console**: https://console.cloud.google.com/home/dashboard?project=omi-live-backend
- 🚀 **Backend Service**: https://console.cloud.google.com/run/detail/us-central1/omi-live-backend/metrics?project=omi-live-backend
- 📜 **Logs**: https://console.cloud.google.com/logs/query?project=omi-live-backend
- 🔐 **Secrets**: https://console.cloud.google.com/security/secret-manager?project=omi-live-backend

### Firebase Console
- 📱 **Frontend Hosting**: https://console.firebase.google.com/project/omi-live-backend/hosting
- 📈 **Analytics**: https://console.firebase.google.com/project/omi-live-backend/analytics

---

## 💻 Terminal Commands Reference

### 📈 Monitoring & Logs

#### Stream Live Logs (Real-time)
```bash
# Get recent logs (refresh manually)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-live-backend" --limit=10 --format="value(timestamp,severity,textPayload)"

# Monitor logs with auto-refresh every 3 seconds
watch -n 3 'gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-live-backend" --limit=5 --format="value(timestamp,severity,textPayload)" --freshness=5m'

# 🌟 BEST OPTION: Use Cloud Console for real-time streaming
# https://console.cloud.google.com/run/detail/us-central1/omi-live-backend/logs?project=omi-live-backend
```

#### Get Recent Logs
```bash
# Get last 10 log entries with readable format
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-live-backend" --limit=10 --format="value(timestamp,severity,textPayload)"
```

#### Check for Errors
```bash
# Get recent error logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-live-backend AND severity>=WARNING" --limit=10 --format="table(timestamp,severity,textPayload)"
```

### 🚀 Service Management

#### Check Service Status
```bash
# Get detailed service information
gcloud run services describe omi-live-backend --region=us-central1
```

#### List All Services
```bash
# See all your Cloud Run services
gcloud run services list
```

#### Get Service URL
```bash
# Get the direct Cloud Run URL
gcloud run services describe omi-live-backend --region=us-central1 --format="value(status.url)"
```

### 🔄 Deployments & Revisions

#### List Recent Revisions
```bash
# See deployment history
gcloud run revisions list --service=omi-live-backend --region=us-central1 --limit=5
```

#### Update Environment Variables
```bash
# Example: Update CORS whitelist
gcloud run services update omi-live-backend --region=us-central1 --set-env-vars="WHITE_LIST_URLS=https://omi-live-backend.web.app,https://yourdomain.com"
```

---

## 🗄️ Database Access

### 🔐 Secrets Management

#### List All Secrets
```bash
# See all stored secrets (DATABASE_URL, JWT_SECRET, etc.)
gcloud secrets list
```

#### Get Database URL (⚠️ Sensitive!)
```bash
# Get production database connection string
gcloud secrets versions access latest --secret="database-url"
```

**⚠️ Warning**: Never run this in shared terminals or save output to files!

### 🎨 Visual Database Browser (Prisma Studio)

#### Quick Setup
```bash
# 1. Navigate to backend directory
cd backend

# 2. Set database URL temporarily (from secret)
export DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url")

# 3. Open Prisma Studio (visual database browser)
npx prisma studio
```

This opens a web interface at `http://localhost:5555` to browse your production database visually.

#### Database Operations
```bash
# Check database status
npx prisma db pull

# Run migrations (be careful in production!)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## 🔍 Health Checks & Testing

### Backend Health Check
```bash
# Test if your backend is responding
curl https://omi-live-backend-da2bnqrnoq-uc.a.run.app/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-09-24T17:04:08.382Z","uptime":15.515537767}
```

### Frontend Check
```bash
# Test if frontend is serving
curl -I https://omi-live-backend.web.app/
```

### API Endpoints Test
```bash
# Test API endpoints
curl https://omi-live-backend-da2bnqrnoq-uc.a.run.app/v1/
```

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### CORS Errors
If frontend can't connect to backend:
```bash
# Check current CORS settings
gcloud run services describe omi-live-backend --region=us-central1 --format="json" | grep -A 5 "WHITE_LIST_URLS"

# Update CORS whitelist
gcloud run services update omi-live-backend --region=us-central1 --set-env-vars="WHITE_LIST_URLS=https://omi-live-backend.web.app"
```

#### Service Not Responding
```bash
# Check if service is running
gcloud run services describe omi-live-backend --region=us-central1 --format="value(status.conditions[0].status)"

# Restart service by deploying latest revision
gcloud run services update omi-live-backend --region=us-central1 --image=us-central1-docker.pkg.dev/omi-live-backend/omi-backend/omi-live-backend:latest
```

#### Database Connection Issues
```bash
# Test database connectivity
export DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url")
cd backend && npx prisma db pull
```

### Log Analysis
```bash
# Search for specific errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-live-backend AND textPayload:\"error\"" --limit=10

# Filter by time range (last hour)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-live-backend AND timestamp>=\"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\"" --limit=20
```

---

## ⚡ Quick Commands Cheat Sheet

```bash
# Monitor live logs (best option: use Cloud Console)
# https://console.cloud.google.com/run/detail/us-central1/omi-live-backend/logs?project=omi-live-backend

# Or get recent logs via CLI
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=omi-live-backend" --limit=10 --format="value(timestamp,severity,textPayload)"

# Check health
curl https://omi-live-backend-da2bnqrnoq-uc.a.run.app/health

# Open database browser
export DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url") && cd backend && npx prisma studio

# Update CORS
gcloud run services update omi-live-backend --region=us-central1 --set-env-vars="WHITE_LIST_URLS=https://omi-live-backend.web.app"

# Check service status
gcloud run services describe omi-live-backend --region=us-central1 --format="value(status.conditions[0].status)"
```

---

## 🔧 Environment Variables

Your production environment uses these key variables (stored in Google Secrets):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Authentication secret
- `better-auth-secret` - Better Auth configuration
- `WHITE_LIST_URLS` - CORS allowed origins
- `NODE_ENV=production` - Environment mode

### View All Environment Variables
```bash
# See all environment variables set on the service
gcloud run services describe omi-live-backend --region=us-central1 --format="json" | grep -A 50 "env:"
```

---

## 📱 Mobile & Browser Testing

### Test Frontend
1. Open: https://omi-live-backend.web.app/
2. Check browser console for errors (F12)
3. Test API calls in Network tab

### Test Backend API
1. Direct API: https://omi-live-backend-da2bnqrnoq-uc.a.run.app/
2. Health check: `/health`
3. API docs: `/api-docs` (if available)

---

## 🚀 Deployment Workflow

### Frontend (Firebase)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend (Cloud Run)
Backend auto-deploys from your CI/CD pipeline, but manual deployment:
```bash
cd backend
gcloud run deploy omi-live-backend --region=us-central1 --source=.
```

---

## 📋 Monitoring Checklist

Daily/Weekly checks:
- [ ] Check error logs for unusual patterns
- [ ] Verify service health endpoints
- [ ] Monitor response times in Cloud Console
- [ ] Check database performance
- [ ] Review CORS errors (if any)
- [ ] Monitor memory/CPU usage

---

## 🆘 Emergency Contacts & Procedures

### If Site is Down
1. Check Cloud Run service status in console
2. Review recent logs for errors
3. Verify DNS/Firebase hosting status
4. Check database connectivity

### Rollback Procedure
```bash
# List recent revisions
gcloud run revisions list --service=omi-live-backend --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic omi-live-backend --region=us-central1 --to-revisions=REVISION_NAME=100
```

---

**📌 Pro Tip**: Bookmark this file and the dashboard links for quick access to your production environment!
