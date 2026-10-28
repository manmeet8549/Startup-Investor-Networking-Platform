# Founders Den — Production Deployment & Operations Guide

This guide details the complete production architecture, deployment sequence, configuration specifications, and operational playbooks for Founders Den on **Render** (Backend API), **Vercel** (Frontend App), and **Supabase** (Database, Authentication, and Storage).

---

## 1. System Architecture Diagram

```
                              +---------------------------------------+
                              |         End Users (Web Browsers)      |
                              +---------------------------------------+
                                    |                           |
                  HTTPS Requests    |                           | Auth / Direct Uploads
                                    v                           v
              +----------------------------+       +----------------------------+
              |     Frontend (Vercel)      |       |      Supabase Cloud        |
              |  Next.js 16 (App Router)   |       |  - Supabase Auth (GoTrue)  |
              |  Hosted on *.vercel.app    |       |  - Storage: startup-docs   |
              +----------------------------+       +----------------------------+
                            |                                    ^
                 REST API   | (CORS Restricted)                  |
                 Calls      v                                    |
              +----------------------------+                     |
              |      Backend (Render)      |---------------------+
              | Node.js 20+ Express API    | Pooler (Port 5432/6543)
              | Entrypoint: dist/server.js | PostgreSQL 15+ (RLS Active)
              +----------------------------+
```

---

## 2. Exact Order of Deployment Steps

To ensure zero downtime and prevent broken dependencies, follow this deployment sequence:

1. **Step 1: Supabase Setup**
   - Confirm project is provisioned (e.g., project ref `tdvvdkobcgfrvotzdcor`).
   - Create private storage bucket `startup-documents`.
   - Configure Authentication Site URL and Redirect URLs.
2. **Step 2: Database Migrations**
   - Execute `npm run db:migrate` using `MIGRATION_DATABASE_URL` (or direct connection).
   - Verify all 8 migration files are applied and recorded in `schema_migrations`.
3. **Step 3: Backend Deployment on Render**
   - Deploy backend web service using `render.yaml` or Render Dashboard.
   - Set environment variables (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`).
   - Verify `/health` returns HTTP 200 and `/api/v1/ready` returns HTTP 200.
   - Note the assigned backend URL (e.g. `https://founders-den-backend.onrender.com`).
4. **Step 4: Frontend Deployment on Vercel**
   - Import repository to Vercel with Root Directory set to `frontend`.
   - Set environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Deploy production build.
   - Note the assigned Vercel URL (e.g. `https://founders-den.vercel.app`).
5. **Step 5: CORS & URL Finalization**
   - Update `CORS_ORIGIN` in Render to match your exact Vercel URL (e.g. `https://founders-den.vercel.app`).
   - Update Supabase Redirect URLs with your Vercel domain.

---

## 3. Environment Variables Specification

### 3.1 Backend (Render Web Service)

> [!NOTE]
> Do NOT set the `PORT` environment variable in Render. Render assigns and injects `PORT` dynamically at container runtime. Defining it manually can cause port collision or binding failures.

| Environment Variable | Where Used | Secret? | Example Format (No Real Secrets) |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `backend/src/config.ts` | No | `production` |
| `LOG_LEVEL` | `backend/src/utils/logger.ts`| No | `info` |
| `USE_IN_MEMORY_DB` | `backend/src/config.ts` | No | `false` (Mandatory false in prod) |
| `CORS_ORIGIN` | `backend/src/app.ts` | No | `https://founders-den.vercel.app` |
| `DATABASE_URL` | `backend/src/db/pool.ts` | **YES** | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require` |
| `MIGRATION_DATABASE_URL` | `backend/src/db/migrate.ts` | **YES** | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require` |
| `SUPABASE_URL` | `backend/src/db/supabase.ts`| No | `https://[REF].supabase.co` |
| `SUPABASE_ANON_KEY` | `backend/src/config.ts` | No | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/src/config.ts`| **YES** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_JWT_SECRET` | `backend/src/config.ts` | **YES** | `your-supabase-jwt-secret-here` (Optional) |

> [!IMPORTANT]
> **Why Use the Session Pooler for `MIGRATION_DATABASE_URL`?**
> Supabase's direct database hostname (`db.[REF].supabase.co`) resolves to IPv6-only addresses on modern Supabase instances. GitHub Actions and cloud build runners commonly operate on IPv4-only networks, causing direct connections to fail with `ETIMEDOUT` or `ENETUNREACH`. The Supabase Session Pooler (`aws-0-[REGION].pooler.supabase.com:5432`) provides dual-stack IPv4/IPv6 support and permits transactional DDL statements. Always use the **Session Pooler** on port **5432** (do not use the Transaction Pooler on port 6543 for migrations, as transaction pooling disallows DDL commands).

### 3.2 Frontend (Vercel Project)

| Environment Variable | Where Used | Secret? | Example Format (No Real Secrets) |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `frontend/lib/api-client.ts`| No | `https://founders-den-backend.onrender.com/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/lib/supabase.ts` | No | `https://[REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/lib/supabase.ts` | No | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

> [!NOTE]
> `frontend/lib/api-client.ts` sanitizes `NEXT_PUBLIC_API_URL`: if the `/api/v1` suffix is present, it preserves it; if omitted, it automatically appends `/api/v1`. Specifying `https://founders-den-backend.onrender.com/api/v1` in production and `http://localhost:5000/api/v1` in local development is the canonical standard.

> [!WARNING]
> Never configure `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` on Vercel. Those secrets are server-only and belong strictly on Render.

---

## 4. Manual Supabase Configuration Checklist

Navigate to the [Supabase Dashboard](https://supabase.com/dashboard) and verify the following settings:

1. **Authentication > URL Configuration**:
   - **Site URL**: Set to `https://founders-den.vercel.app` (your production frontend).
   - **Redirect URLs**: Add:
     - `https://founders-den.vercel.app/**`
     - `https://*-founders-den.vercel.app/**` (allows preview branch deployments)
     - `http://localhost:3000/**` (for local development)
2. **Authentication > Email Auth**:
   - **Confirm Email**: For staging/hackathon velocity, toggle **Confirm email** off if immediate login without inbox verification is desired. For strict security, leave enabled.
3. **Storage > Buckets**:
   - Bucket Name: `startup-documents`
   - Public: **OFF** (Must be strictly private)
   - File size limit: `10MB` (`10485760` bytes)
   - Allowed MIME types: `application/pdf`

---

## 5. Database Migrations & Rollback Procedures

### 5.1 Applying Migrations
Founders Den includes a dedicated migration runner with atomic transaction safety and tracking via `public.schema_migrations`:

```bash
cd backend
npm run db:migrate
```
When running in CI/CD, the workflow `.github/workflows/migrate.yml` automatically triggers `npm run db:migrate` on every push to `main`.

### 5.2 Rollback Procedure
If a migration fails or must be rolled back:
1. Identify the failing migration file name (e.g. `20261027000008_mentorship_incubation_and_notifications.sql`).
2. Write a compensating down migration (e.g. `20261027000009_revert_feature.sql`) that safely drops or alters tables.
3. Apply via `npm run db:migrate`.
4. If emergency manual intervention is required, connect directly using `psql` or the Supabase SQL Editor and execute the down SQL, then delete the corresponding record from `public.schema_migrations`:
   ```sql
   DELETE FROM public.schema_migrations WHERE version = '20261027000008_mentorship_incubation_and_notifications.sql';
   ```

---

## 6. Secret & Key Rotation Playbook

### 6.1 Rotating Credentials on the CURRENT Supabase Project

If credentials on the current Supabase project (`tdvvdkobcgfrvotzdcor`) need to be rotated:

#### 1. Rotating the Database Password:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/tdvvdkobcgfrvotzdcor/settings/database).
2. Scroll to **Database Password** and click **Reset database password**.
3. Generate a strong new password (minimum 16 characters).
4. Update the following deployment secrets immediately:
   - **Render Dashboard**: Update `DATABASE_URL` and `MIGRATION_DATABASE_URL` environment variables.
   - **GitHub Repository Secrets**: Update `DATABASE_URL` and `MIGRATION_DATABASE_URL` for CI/CD actions.
   - **Local Environment**: Update `DATABASE_URL` in `backend/.env`.
5. Trigger a redeploy on Render: **Deploy Latest Commit**.
6. Verify connectivity by requesting `GET /health` and reviewing server startup logs.

#### 2. Rotating the Service Role Key and Anon Public Key:
1. Open [Supabase Dashboard > Settings > API](https://supabase.com/dashboard/project/tdvvdkobcgfrvotzdcor/settings/api).
2. Under **JWT Settings**, click **Generate a new JWT secret** (or roll the service role key).
   > [!WARNING]
   > Rotating the JWT secret immediately revokes all issued tokens. All logged-in users will need to re-authenticate.
3. Copy the newly generated **anon (public)** and **service_role (secret)** keys.
4. Update the keys across environments:
   - **Render Dashboard**: Update `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
   - **Vercel Dashboard**: Update `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Local Environment**: Update `backend/.env` and `frontend/.env.local`.
5. Redeploy both Render and Vercel.

---

### 6.2 Scrubbing Exposed Passwords & Secrets from Git History

If a previous database password or service role secret was ever committed to Git history, scrub it permanently across all commits and refs using `git-filter-repo` (the official Git-recommended tool):

```bash
# 1. Install git-filter-repo (requires Python 3)
pip install git-filter-repo

# 2. Create a clean bare or mirror clone in a temporary folder
git clone --mirror https://github.com/<org>/<repo>.git repo-scrub
cd repo-scrub

# 3. Create a replacement file matching sensitive strings to [REDACTED]
cat << 'EOF' > expressions.txt
regex:(?i)(postgresql:\/\/postgres:)[^@]+(@.*)==>\1[REDACTED]\2
regex:(?i)(SUPABASE_SERVICE_ROLE_KEY=)[^\n\r]+==>\1[REDACTED]
OLD_EXPOSED_PASSWORD==>[REDACTED]
EOF

# 4. Scrub the sensitive strings from all commits, commit messages, and tags
git-filter-repo --replace-text expressions.txt

# 5. Remove any accidentally tracked sensitive environment files
git-filter-repo --invert-paths --path backend/.env --path frontend/.env.local

# 6. Force-push the rewritten history to your remote repository
git push origin --force --all
git push origin --force --tags

# 7. Notify all team members to re-clone the repository (do NOT pull into an old clone):
# git clone https://github.com/<org>/<repo>.git
```

---

## 7. Troubleshooting Guide

### 7.1 CORS Errors
- **Symptom**: Browser console logs `Access to fetch at ... from origin 'https://founders-den.vercel.app' has been blocked by CORS policy`.
- **Root Cause**: Render `CORS_ORIGIN` does not match the frontend request origin.
- **Fix**: Check `CORS_ORIGIN` on Render. Ensure:
  1. The protocol (`https://`) matches.
  2. No trailing slash is included (`https://founders-den.vercel.app`, NOT `https://founders-den.vercel.app/`).
  3. If testing preview branches, include them comma-separated: `https://founders-den.vercel.app,https://preview.vercel.app`.

### 7.2 Cold Starts on Free Render Plan
- **Symptom**: First API request takes 50–90 seconds after 15 minutes of inactivity.
- **Root Cause**: Render Free tier spins down web services to 0 instances when idle.
- **Fix**:
  1. Upgrade to Render `starter` plan ($7/mo) which is always-on.
  2. Or configure an external uptime monitor (e.g. UptimeRobot or Cron) to ping `GET /health` every 10 minutes.

### 7.3 HTTP 401 Unauthorized After Key Rotation
- **Symptom**: Requests return `401 TOKEN_EXPIRED` or `Invalid token signature`.
- **Root Cause**: Client browser has cached an old JWT token issued with the prior secret.
- **Fix**: Clear `founders_den_token` from `localStorage` in browser DevTools or log out and log back in.
