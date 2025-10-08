# Supabase Database Setup

## Quick Setup Guide

Your production database needs to be initialized with the schema. Follow these steps:

### 1. Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `gzfzcrecyhmtbuefyvtr`
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**

### 2. Run the Schema Migration

1. Open the file `schema.sql` in this repository
2. Copy the entire contents (all 1193 lines)
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

The script will create:
- All database enums (UserRole, PlanType, AuditEventType, etc.)
- All tables (users, organizations, documents, audit_logs, etc.)
- All indexes for performance
- All foreign key relationships

### 3. Verify Installation

After running the script, verify that the tables were created:

```sql
-- Run this query to see all tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see tables like:
- users
- organizations
- documents
- audit_logs
- pricing_plans
- subscriptions
- etc.

### 4. Test the Deployment

Once the database is initialized, visit your production URL:
- https://document-chat-system-mcz6x1gmb-watat83s-projects.vercel.app

The "prepared statement" errors should now be resolved because:
1. ✅ DATABASE_URL now includes `?pgbouncer=true`
2. ✅ All database tables exist

## Troubleshooting

### If you get "relation already exists" errors:

This means some tables were already created. You can either:
1. Ignore the errors (tables that exist will skip, new ones will be created)
2. Drop all tables first (⚠️ **WARNING: This deletes all data!**):

```sql
-- Only run this if you want to start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then re-run the schema.sql file.

### If you get permission errors:

Make sure you're logged in as the database owner (postgres user).

## What Was Fixed

### Database Connection Pooling Issue

The original error:
```
prepared statement "s19" does not exist
```

This was fixed by adding `?pgbouncer=true` to the DATABASE_URL in Vercel production environment.

**Before:**
```
postgresql://postgres.gzfzcrecyhmtbuefyvtr:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

**After:**
```
postgresql://postgres.gzfzcrecyhmtbuefyvtr:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

The `pgbouncer=true` parameter tells Prisma to use transaction pooling mode, which is compatible with Supabase's connection pooler.

## Next Steps

After completing the database setup:

1. ✅ Database schema initialized (run schema.sql)
2. ✅ Production deployed with correct DATABASE_URL
3. Test your application at the production URL
4. Check Vercel logs to ensure no more errors

## Need Help?

If you encounter any issues:
1. Check Vercel logs: `vercel logs --prod`
2. Check Supabase logs in the Supabase dashboard
3. Verify environment variables: `vercel env ls production`
