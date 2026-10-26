# Founders Den — MVP Engineering Progress

## Milestone Roadmap

| Iteration | Focus Area | Status |
|---|---|---|
| **Iteration 1** | **Backend Scaffolding, DB Migrations, Auth, Profiles, Student Flag & Verification Queue** | **Completed** |
| **Iteration 2** | Startup Profiles, Public Discovery, Filtering & Pagination | Planned |
| **Iteration 3** | Pitch Decks, Private Storage Bucket & Short-Lived Signed URLs | Planned |
| **Iteration 4** | Weighted Investor Matching Engine & Deal Pipeline | Planned |
| **Iteration 5** | Mentorship Requests & Incubator Programs Lifecycle | Planned |
| **Iteration 6** | Basic Messaging, Content Moderation & Full Frontend Live Integration | Planned |

---

## Iteration 1 Details

### Completed Deliverables
1. **Repository Layout**:
   - Organized into `/backend`, `/frontend`, `/supabase/migrations`, and `/docs`.
   - Setup Node.js 20 + TypeScript + Express backend with Pino logging, Zod validation, Vitest + Supertest harness.
2. **Database Foundation & Security (Migration `20261027000001_initial_schema.sql`)**:
   - `public.user_role`: `founder`, `investor`, `mentor`, `incubator`, `admin`.
   - `public.user_status`: `active`, `suspended`.
   - `public.verification_status`: `pending`, `verified`, `rejected`.
   - `public.profiles` table: linked to `auth.users(id)` with `is_student` boolean flag, organization, bio, location, website, etc.
   - `public.verification_requests` table: records verification submissions, reviewer admin, timestamps, and notes.
   - Defense-in-depth: Row Level Security (RLS) enabled on all tables, with role helper functions (`current_user_role()`, `is_admin()`).
3. **Core API Endpoints**:
   - `GET /api/v1/health`: Health status and service meta.
   - `POST /api/v1/auth/signup`: User registration with role selection, student flag, and auto-enqueuing of non-founder verification requests.
   - `POST /api/v1/auth/login`: Authentication returning user profile and Supabase JWT.
   - `GET /api/v1/auth/me`: Authenticated profile retrieval directly from DB.
   - `PATCH /api/v1/auth/me`: Profile updates with role privilege escalation protection.
   - `GET /api/v1/profiles/:id`: Public profile lookup.
   - `GET /api/v1/admin/users`: Paginated admin user listing with role and search filters.
   - `PATCH /api/v1/admin/users/:id/status`: Admin account suspension/activation and role moderation.
   - `GET /api/v1/admin/verifications`: Paginated admin queue for reviewing pending verification requests.
   - `PATCH /api/v1/admin/verifications/:id`: Admin approval/rejection with automatic profile status synchronization.
4. **Automated Testing Suite**:
   - 20 unit and integration tests passing with 100% pass rate in Vitest.
   - Tests cover registration, login, role forgery rejection, student innovator flag, account suspension, admin RBAC guards, pagination, and verification lifecycle.
5. **Documentation**:
   - `docs/API.md`: Detailed request/response schemas, status codes, and security requirements.
   - `docs/PROGRESS.md`: Tracking roadmap, completed features, assumptions, and known gaps.

---

## Assumptions
1. **Database Role Source of Truth**: The JWT contains the user ID (`sub`). The user's role is always fetched directly from the database `profiles` table to prevent token manipulation or client-side role tampering.
2. **Student Innovator Representation**: Rather than creating a separate role, student status is implemented as an `is_student` boolean profile flag on `founder` accounts. This allows student founders to access all founder tools while qualifying for campus-specific programs and filters.
3. **Verification Policy**: Founders are verified immediately upon registration. Non-founder roles (`investor`, `mentor`, `incubator`) are created in a `pending` state and automatically added to the admin `verification_requests` queue.
4. **Environment & Testing Flexibility**: The database layer connects via `pg.Pool` when `DATABASE_URL` is set, and falls back to an in-memory database store for fast, deterministic, offline test execution.
5. **Suspended Accounts**: When an admin marks an account as `suspended`, both `login` and authenticated requests via JWT are immediately rejected with status `403 ACCOUNT_SUSPENDED`.

---

## Known Gaps (Deferred to Subsequent Iterations)
1. **Startup Management**: Startup CRUD and company members table will be implemented in Iteration 2.
2. **File Storage & Pitch Decks**: Supabase Storage integration with short-lived signed URLs will be implemented in Iteration 3.
3. **Matching Algorithm**: Multi-factor scoring engine (sector 30%, stage 25%, funding 20%, location 15%, model 10%) will be built in Iteration 4.
4. **Incubator & Mentorship Workflows**: Application lifecycle and mentor availability booking will be built in Iteration 5.
5. **Live Frontend Wiring**: Frontend UI currently uses styled prototype mocks; live data wiring will occur in harmony with each backend feature set.
