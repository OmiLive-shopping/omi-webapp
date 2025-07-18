# Production Migration Guide

## Prerequisites
- Backup the production database before any migration
- Ensure DATABASE_URL and SHADOW_DATABASE_URL are correctly set
- Have rollback plan ready

## Migration Steps

### 1. Create Migration Locally
Since the non-interactive environment prevents creating migrations directly, follow these steps on a local machine:

```bash
# Clone the repository locally
git clone <repository-url>
cd omi-webapp/backend

# Install dependencies
npm install

# Set up local database matching production schema
# Copy current production schema to local database

# Generate migration
npx prisma migrate dev --name add_streaming_models

# This creates a migration file in prisma/migrations/
# Commit and push this file
```

### 2. Deploy to Production

```bash
# On production server
cd /path/to/omi-webapp/backend

# Pull latest code with migration files
git pull

# Apply migrations
npx prisma migrate deploy

# Verify migration
npx prisma db pull
```

### 3. Rollback Procedure

If rollback is needed:

```bash
# Option 1: Using SQL script
psql $DATABASE_URL < prisma/rollback/rollback_streaming_models.sql

# Option 2: Restore from backup
pg_restore -d database_name backup_file.dump
```

### 4. Verification Steps

After migration:
1. Check all tables exist: User, Product, Stream, StreamProduct, Comment
2. Verify foreign key constraints
3. Test cascade deletes
4. Confirm indexes are created
5. Run application tests

### 5. Post-Migration Tasks

1. Update environment variables if needed
2. Deploy application code that uses new models
3. Monitor application logs for any issues
4. Test all new features

## Important Notes

- Never use `prisma db push` in production
- Always test migrations in staging first
- Keep backups for at least 7 days after migration
- Document any manual interventions required