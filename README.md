# Founders Den — Startup & Investor Networking Platform

Founders Den is a startup and investor networking platform connecting founders, student innovators, investors, mentors, and incubators with trust, access-controlled pitch decks, and compatibility matching.

---

## Architecture Overview
- **/backend**: Node.js 20 + TypeScript, Express, Supabase (PostgreSQL, Auth), pg pool (SSL on), Zod validation, Vitest + Supertest, Pino logging, Helmet security, rate limiting.
- **/frontend**: Next.js 14 + React 18, Tailwind CSS, TypeScript, typed API client.
- **/supabase**: Local Supabase stack configuration and SQL migrations (`/supabase/migrations`).
- **/docs**: Comprehensive API specification (`API.md`) and project progress tracking (`PROGRESS.md`).

---

## Quick Setup (Under 10 Steps)

1. **Clone Repository**
   ```bash
   git clone https://github.com/manmeet8549/Startup-Investor-Networking-Platform.git
   cd Startup-Investor-Networking-Platform
   ```

2. **Configure Backend Environment**
   ```bash
   cp backend/.env.example backend/.env
   ```
   *Fill in your Supabase URL, Anon Key, Service Role Key, and Database connection string in `backend/.env`.*

3. **Install Backend Dependencies**
   ```bash
   cd backend && npm install
   ```

4. **Run Backend Test Suite**
   ```bash
   npm test
   ```
   *Runs 25 automated unit & integration tests covering health checks, environment validation, auth, and admin moderation.*

5. **Start Local Supabase Stack (Optional for Local Development)**
   ```bash
   npx supabase start
   ```
   *Starts local PostgreSQL (port 54322), Supabase Studio (port 54323), Auth, and Storage.*

6. **Apply Database Migrations**
   ```bash
   npx supabase db push
   ```
   *Applies migrations located in `supabase/migrations` (creates profiles, roles, verification queue, and RLS policies).*

7. **Start Backend API Server**
   ```bash
   npm run dev
   ```
   *API will run at `http://localhost:5000/api/v1`.*

8. **Configure and Start Frontend**
   ```bash
   cd ../frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```
   *Frontend portal will run at `http://localhost:3000`.*

9. **Verify System Health**
   Open `http://localhost:5000/api/v1/health` in your browser. You should receive:
   ```json
   {
     "data": {
       "status": "healthy",
       "database": "connected",
       "version": "1.0.0"
     }
   }
   ```

---

## Backend NPM Scripts
- `npm run dev`: Start development server with file watch (`tsx`)
- `npm run build`: Compile TypeScript to `dist/`
- `npm run start`: Run compiled production server
- `npm test`: Run automated Vitest test suite
- `npm run lint`: Run ESLint checks
- `npm run typecheck`: Run TypeScript type-checking without emitting files
- `npm run format`: Format source files with Prettier

---

## API Conventions & Documentation
- Base path: `/api/v1`
- Envelope formats:
  - Success: `{ "data": ..., "meta": ... }`
  - Error: `{ "error": { "code": "...", "message": "...", "details": ... } }`
- Full endpoint specifications are available in [docs/API.md](docs/API.md).
