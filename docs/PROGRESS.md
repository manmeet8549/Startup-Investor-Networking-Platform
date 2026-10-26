# Founders Den — MVP Engineering Progress

## Milestone Roadmap

| Iteration | Focus Area | Status |
|---|---|---|
| **Iteration 1** | **Backend Scaffolding, DB Migrations, Auth, Profiles, Student Flag & Verification Queue** | **Completed** |
| **Iteration 2** | **Database Schema, Constraints, RLS, Enums & Seed Data** | **Completed** |
| **Iteration 3** | **Authentication, Roles, Profiles & Admin Verification (Supabase Auth)** | **Completed** |
| **Iteration 4** | **Startup Profiles, Team CRUD, Pitch Decks, Supabase Storage & Access Control** | **Completed** |
| **Iteration 5** | Weighted Investor Matching Engine & Deal Pipeline | Planned |
| **Iteration 6** | Mentorship Requests & Incubator Programs Lifecycle | Planned |

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

## Iteration 2 Details

### Completed Deliverables
1. **PostgreSQL Enums & Schema Migration (`20261027000003_full_mvp_data_model.sql`)**:
   - Enums: `user_role`, `verification_status` (`pending`, `approved`, `verified`, `rejected`, `suspended`), `startup_stage` (`idea`, `validation`, `mvp`, `early_traction`, `growth`), `visibility` (`public`, `access_controlled`, `private`), `request_status`, `pipeline_status` (`interested`, `meeting_requested`, `in_discussion`, `passed`, `follow_up`), `application_status` (`submitted`, `under_review`, `shortlisted`, `accepted`, `rejected`).
   - Tables: `profiles`, `founder_profiles`, `investor_profiles`, `mentor_profiles`, `incubator_profiles`, `startups`, `startup_team_members`, `documents` (versioned), `document_access_requests`, `watchlist`, `investor_notes`, `investor_startup_status`, `pitch_requests`, `connections`, `messages`, `mentorship_requests`, `mentor_feedback`, `incubator_programs`, `applications`, `notifications`, `match_scores`, `reports`, `audit_logs`.
2. **Constraints, Indexes & Full-Text Search**:
   - Ticket range check: `CONSTRAINT check_ticket_range CHECK (ticket_min <= ticket_max)`.
   - Relational uniqueness: `unique_program_startup_application`, `unique_watchlist_entry`, `unique_connection_pair`, `unique_investor_startup_note`.
   - Distinct participants: `user_a_id != user_b_id` on connections, `sender_id != recipient_id` on messages.
   - GIN indexes on array columns: `investor_profiles(sectors)`, `investor_profiles(stages)`, `investor_profiles(regions)`, `mentor_profiles(expertise)`, `incubator_programs(sectors)`.
   - Full-text search `tsvector` with weighted trigger (`startups_generate_tsv()`) on name, tagline, sector, location, and description.
   - `updated_at` automated triggers across all tables.
3. **Row Level Security (RLS)**:
   - Enabled RLS on all 23 database tables.
   - Policies ensuring users manage own records, investor notes and watchlist are private to owner, messages are private to conversation participants, startups follow visibility rules, and admin has global bypass access.
4. **Idempotent Reset & Seed Scripts**:
   - `backend/src/db/seed-data.ts` and `backend/src/db/reset.ts`:
     - 1 Platform Admin
     - 3 Founders with 5 Startups (including FarmSense, an AgriTech MVP in Punjab asking ₹15 Lakh INR)
     - 3 Investors with distinct ticket sizes and sector theses
     - 2 Mentors with advisory expertise
     - 2 Incubators with 3 active cohorts/programs
     - Initial applications, documents, watchlist, investor notes, and messages
   - Added npm scripts: `npm run db:reset` and `npm run db:seed`.
5. **Shared TypeScript Types & Typed Mock Factories**:
   - `backend/src/db/schema.types.ts`: Exhaustive TypeScript interfaces for all database tables and enums.
   - `frontend/types/database.ts`: Synchronized database types for frontend consumption.
   - `frontend/lib/mock-data.ts`: Typed mock data factories (`createMockStartup`, `createMockInvestor`, `createMockProgram`) wired into `frontend/app/page.tsx` without changing existing visual screens.
6. **Automated Testing Suite**:
   - `backend/src/tests/iteration2.test.ts` (12 tests covering clean reset, constraints, RLS policies, and seed data).
   - Total backend tests expanded to 54 tests across 5 test suites (100% passing in ~1.4s).

---

## Iteration 3 Details

### Completed Deliverables
1. **Supabase Auth Middleware**:
   - `authenticate`: verifies Supabase/custom JWT tokens against `SUPABASE_JWT_SECRET`, loads user profile directly from database, blocks suspended accounts with `403 ACCOUNT_SUSPENDED`.
   - `requireRole(...roles)`: RBAC middleware strictly reading from database role.
   - `requireVerified`: rejects unverified (`pending` or `rejected`) non-admin users with `403 UNVERIFIED_ACCOUNT`.
2. **Registration Profile Endpoint (`POST /api/v1/auth/register-profile`)**:
   - Accepts roles `founder`, `investor`, `mentor`, `incubator`.
   - Strictly blocks registration as `admin` (`403 FORBIDDEN`).
   - Founders verified immediately (`verified`); other roles initialized as `pending` and enqueued for admin review.
3. **Role Profiles & Self Endpoints**:
   - `GET /api/v1/me` and `PATCH /api/v1/me` (role escalation prevented).
   - `GET` and `PUT` for `/api/v1/me/founder-profile`, `/api/v1/me/investor-profile`, `/api/v1/me/mentor-profile`, `/api/v1/me/incubator-profile`.
4. **Admin Verification & Moderation**:
   - `GET /api/v1/admin/verifications`: filters requests by `role` and `status`.
   - `POST /api/v1/admin/verifications/:id/approve`: approves verification request, updates profile to `verified`, writes to `audit_logs`.
   - `POST /api/v1/admin/verifications/:id/reject`: rejects verification request with required rejection reason, updates profile to `rejected`, writes to `audit_logs`.
5. **Frontend (Static to Dynamic Integration)**:
   - Dynamic Sign Up (with 4-role picker, student innovator checkbox), Login, and Forgot Password modal using `@supabase/supabase-js`.
   - `AuthContext` with automatic token refresh, session persistence, role guards, and post-login portal redirection.
   - Dynamic sidebar navigation per role; pending approval banner for unverified investor/mentor/incubator accounts.
   - Live Admin Verification Queue with Approve/Reject buttons wired to backend endpoints.
   - Editable Profile & Settings connected directly to `/me` and `/me/*-profile`.
6. **Testing Suite**:
   - Vitest suite expanded to 42 tests across 4 test suites (100% passing).
   - Full coverage for role registration, admin rejection, role escalation prevention, verified-only dealfeed access, audit logs, and token tamper/expiry defenses.

---

## Iteration 4 Details

### Completed Deliverables
1. **Database Schema Enhancements & Storage Setup**:
   - Migration `20261027000004_startup_details_and_storage.sql`:
     - Added `logo`, `sectors TEXT[]`, `problem`, `solution`, `target_market`, `business_model` to `startups` table.
     - Added `payload JSONB` to `notifications` table for structured notification metadata.
     - Created private Supabase Storage bucket `startup-documents` with strict RLS policies.
   - Synchronized TypeScript interfaces in `backend/src/db/schema.types.ts` and `frontend/types/database.ts`.
2. **Founder Startup & Team Member CRUD**:
   - `POST /api/v1/startups`: creates startup with validation across all 11 core fields; automatically computes and returns `profile_completeness`.
   - `GET /api/v1/me/startups`: lists founder's startups with computed completeness.
   - `PATCH /api/v1/startups/:id` & `DELETE /api/v1/startups/:id`: owner-only permission enforcement with 403 Forbidden for non-owners.
   - `GET`, `POST`, `PATCH`, `DELETE /api/v1/startups/:id/team-members`: team member CRUD with primary contact flag and owner authorization.
3. **Profile Completeness Engine**:
   - `computeProfileCompleteness(startup)`: dynamically evaluates 11 fields (`name`, `logo`, `tagline`, `sectors`, `stage`, `problem`, `solution`, `target_market`, `business_model`, `funding_ask`, `location`) returning 0-100 score.
4. **Pitch Decks & Supabase Storage**:
   - Multer middleware validating PDF-only mimetype and strict 10MB limit (`LIMIT_FILE_SIZE`).
   - `POST /api/v1/startups/:id/documents`: uploads to `startup-documents` bucket and increments version per startup (`v1`, `v2`, ...).
   - `GET /api/v1/startups/:id/documents`: lists documents according to caller permissions.
   - `DELETE /api/v1/documents/:id`: owner-only document deletion from database and storage.
5. **Access Control & 60-Second Signed URLs**:
   - Three visibility rules enforced:
     - `public`: any verified user can access; unverified users receive 403 `UNVERIFIED_ACCOUNT`.
     - `access_controlled`: requires an approved access request (`POST /api/v1/documents/:id/access-requests`). Pending and declined requests are refused with 403 `ACCESS_REQUIRED`.
     - `private`: owner & platform admin only; refused with 403 `ACCESS_DENIED`.
   - Founder request list and decision actions: `POST /api/v1/document-access-requests/:id/approve` and `/decline`.
   - `GET /api/v1/documents/:id/download`: generates signed URL valid for exactly 60 seconds (`expires_in: 60`).
   - Notification service: `notify(userId, type, payload)` writes to `notifications` table on access request creation and founder decisions.
6. **Frontend (Static to Dynamic Integration)**:
   - **Founder My Startup Page**: dynamic profile editor with validation, 11-field form (logo, problem, solution, target market, business model, ask, stage, visibility), and team member management.
   - **Pitch Deck & Documents Page**: upload modal with live progress bar, PDF validation, visibility selector, incrementing version badges (`v1`, `v2`), delete action, and working 60-second signed URL download.
   - **Dashboard**: dynamic Profile Completeness progress bar (computed 0-100%) and interactive Deck Access Requests card with working Approve and Decline actions.
   - `frontend/lib/api-client.ts`: added multipart `upload<T>` method with `FormData`.
7. **Testing Suite**:
   - 16 new automated tests in `backend/src/tests/iteration4.test.ts`:
     - Unit tests for completeness calculation (0% to 100%).
     - Owner-only edits and deletions (403 for non-owners).
     - Full visibility matrix across all 5 roles (`founder`, `investor`, `mentor`, `incubator`, `admin`) and all 3 visibility states.
     - PDF file type and 10MB size validation.
     - Version incrementing on repeated uploads.
     - Access requests, founder approve/decline lifecycle, and notification emission.
     - 60-second signed URL verification.
   - Total backend test suite: **70 tests passing** across 6 test files with zero failures.
   - Frontend Next.js production build: compiles and generates static pages cleanly with zero TypeScript errors.

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
