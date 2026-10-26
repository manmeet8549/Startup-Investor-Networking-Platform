# Founders Den — Production Deployment & Operations Guide

This guide details instructions for deploying, configuring, securing, and operating the Founders Den platform in a production cloud environment.

---

## 1. Architecture Overview

- **Frontend**: Next.js 16 (App Router) hosted on **Vercel** or containerized on **Render/Railway**.
- **Backend API**: Node.js 22 + Express REST API hosted on **Render**, **Railway**, or **Fly.io**.
- **Database & Auth**: **Supabase** Managed PostgreSQL 15+ with Row-Level Security (RLS) enabled on all 16 platform tables, Supabase Auth (JWT), and Supabase Storage for secure PDF uploads.
- **API Documentation**: Interactive Swagger UI served live at `/api/docs` and raw OpenAPI spec at `/api/docs/openapi.yaml`.

---

## 2. Supabase Production Project Setup

### 2.1 Create Supabase Project
1. Log in to [Supabase Cloud](https://app.supabase.com) and click **New Project**.
2. Select your region (e.g. `ap-south-1` for Mumbai / India latency optimization).
3. Set a strong database password and note the generated reference ID (`<PROJECT_REF>`).

### 2.2 Run Schema Migrations
All platform tables, indexes, triggers, and Row Level Security policies are maintained under `supabase/migrations/`:
- `20261026000001_initial_schema.sql` (Profiles, Startups, Documents, RLS)
- `20261026000002_verification_and_matching.sql` (Verification queue, investor profiles, vector indexes)
- `20261026000003_engagement_and_pipeline.sql` (Watchlists, notes, pipelines, pitch requests, messaging)
- `20261026000004_mentorship_and_incubation.sql` (Mentor feedback, incubator programs, applications, notifications)
- `20261026000005_admin_and_moderation.sql` (Audit logging, platform reporting, content moderation)

To deploy migrations to production using Supabase CLI:
```bash
# Link to your Supabase cloud project
supabase link --project-ref <PROJECT_REF>

# Apply all pending migrations to the cloud database
supabase db push
```

Alternatively, from the backend directory:
```bash
npm run db:reset
```
This script reads the migration files and executes them sequentially via the pooled PostgreSQL connection.

### 2.3 Row Level Security (RLS) Verification
Confirm RLS is enabled on all tables in the SQL editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
All platform tables must show `rowsecurity = true`.

### 2.4 Private Storage Bucket Configuration
Create the private bucket for startup pitch decks:
1. Navigate to **Storage** > **New Bucket**.
2. Name: `startup-documents`.
3. Set **Public Bucket** to **OFF** (strictly private).
4. File size limit: `10485760` (10 MB).
5. Allowed MIME types: `application/pdf`.

---

## 3. Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `PORT` | HTTP server listening port | `4000` |
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | Pooled PostgreSQL connection string (Supabase Transaction Pooler port 6543) | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `SUPABASE_URL` | Supabase API endpoint | `https://[REF].supabase.co` |
| `SUPABASE_ANON_KEY` | Public anonymous key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side key (bypasses RLS for admin operations) | `eyJhbGciOi...` |
| `SUPABASE_JWT_SECRET` | Secret used to verify HS256 tokens | `[STRONG_RANDOM_SECRET]` |
| `CORS_ORIGIN` | Allowed web origin (strict comma-separated or single domain) | `https://foundersden.in,https://app.foundersden.in` |
| `FRONTEND_URL` | Web app URL for email links and notifications | `https://foundersden.in` |

### Frontend (`frontend/.env.production`)
| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.foundersden.in/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API endpoint | `https://[REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGciOi...` |

---

## 4. API Deployment Options

### Option A: Render (Recommended)
1. **Create Web Service**:
   - Connect your GitHub repository.
   - Root directory: `backend`.
   - Environment: `Node`.
   - Build Command: `npm install && npm run build`.
   - Start Command: `npm run start` (or `node dist/server.js`).
2. **Health Check Path**:
   - Set Health Check Path to `/api/v1/health`.
   - Timeout: 5s, Interval: 15s.
3. **Environment Variables**:
   - Add all variables listed in Section 3 under **Environment**.
4. **Auto-Deploy**: Enable automatic deployment on pushes to `main`.

### Option B: Railway
1. **New Project** > **Deploy from GitHub repo**.
2. Set Root Directory to `/backend`.
3. Railway detects `backend/package.json` and builds via Nixpacks (`npm run build`).
4. Set Start Command to `npm start`.
5. Under **Settings** > **Healthcheck**, set Path to `/api/v1/health`.
6. Add the production environment variables in the **Variables** tab.

### Option C: Fly.io
Deploy using the Fly CLI:
```bash
cd backend
fly launch --name founders-den-api --region bom
fly secrets set \
  DATABASE_URL="postgresql://..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  SUPABASE_JWT_SECRET="..." \
  CORS_ORIGIN="https://foundersden.in"
fly deploy
```

---

## 5. Frontend Deployment (Vercel)

1. Import repository in [Vercel](https://vercel.com).
2. Set Framework Preset: **Next.js**.
3. Set Root Directory: `frontend`.
4. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://api.foundersden.in/api/v1`
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://[REF].supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJ...`
5. Deploy.

---

## 6. Demo Seed Command

To seed a fresh deployment or staging environment with comprehensive demonstration data (founders, startups with complete profiles, verified investors, mentors, incubator programs, applications, notes, and messages):

```bash
cd backend
npm run seed:demo
# or
npm run db:seed
```

This seeds:
- **11 Users across all 5 roles** (`founder`, `investor`, `mentor`, `incubator`, `admin`).
- **5 Startups** across Agriculture, Climate, FinTech, and DeepTech.
- **Verified Investors & Investment Thesis profiles**.
- **Mentors & Active Mentorship requests**.
- **Incubator Accelerator Programs & real Application records**.
- **Audit Logs and System Notifications**.

---

## 7. Health Checks & Latency Monitoring

The platform provides a comprehensive health and readiness probe at:
```http
GET /api/v1/health
```

### Sample Response (`200 OK`):
```json
{
  "status": "ok",
  "uptime": 86400.12,
  "timestamp": "2026-10-27T04:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "database": {
    "status": "connected",
    "latency_ms": 12
  }
}
```
If the database connection pool fails or latency exceeds threshold, status returns `degraded` or `error` with HTTP 503 for automatic container restarts and uptime alerts (e.g. via BetterUptime or Datadog).

---

## 8. Backup & Disaster Recovery Strategy

1. **Daily Automated Backups (Supabase)**:
   - Supabase automatically performs full daily backups on Pro tiers with 7-day retention.
   - Point-in-Time Recovery (PITR) allows rollbacks to any second within the past 7 days.
2. **Automated Scheduled Off-site Logical Backups**:
   Run a daily cron job via GitHub Actions or cloud server to export pg_dump:
   ```bash
   pg_dump "$DATABASE_URL" \
     --format=custom \
     --clean \
     --if-exists \
     --file="foundersden_backup_$(date +%Y%m%d_%H%M%S).dump"
   ```
   Encrypt and upload the dump to AWS S3 or Cloudflare R2 bucket with 30-day lifecycle expiration.
3. **Storage Bucket Replication**:
   Pitch deck PDFs in `startup-documents` bucket can be synced periodically using Supabase storage API / S3 compatible tools to secondary storage.
4. **Disaster Recovery RTO & RPO**:
   - **RTO (Recovery Time Objective)**: < 30 minutes (redeploy container + restore database).
   - **RPO (Recovery Point Objective)**: < 1 minute with Supabase PITR enabled.
