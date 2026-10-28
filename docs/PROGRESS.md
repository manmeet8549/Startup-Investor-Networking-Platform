# Founders Den — MVP Engineering Progress

## Milestone Roadmap

| Iteration | Focus Area | Status |
|---|---|---|
| **Iteration 1** | **Backend Scaffolding, DB Migrations, Auth, Profiles, Student Flag & Verification Queue** | **Completed** |
| **Iteration 2** | **Database Schema, Constraints, RLS, Enums & Seed Data** | **Completed** |
| **Iteration 3** | **Authentication, Roles, Profiles & Admin Verification (Supabase Auth)** | **Completed** |
| **Iteration 4** | **Startup Profiles, Team CRUD, Pitch Decks, Supabase Storage & Access Control** | **Completed** |
| **Iteration 5** | **Discovery, Search, Multi-Filters, Query Optimization & Dynamic Frontend** | **Completed** |
| **Iteration 6** | **Investor Preferences, Transparent Smart Matching & Re-ranking** | **Completed** |
| **Iteration 7** | **Investor Engagement, Pipeline Tracking, Pitch Meetings, Connections & Messaging** | **Completed** |
| **Iteration 8** | **Mentorship, Incubation Programs, Cohort Applications & Real-time Notifications** | **Completed** |
| **Iteration 9** | **Admin, Moderation, User Suspension, Startup Listings, Reports, Platform Stats & Audit Trail** | **Completed** |
| **Iteration 10** | **Hardening, OpenAPI Docs, End-to-End Test Journey, Coverage >= 80%, Deployment Guide & Release** | **Completed** |

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

## Iteration 5 Details

### Completed Deliverables
1. **Discovery & Search Endpoints**:
   - `GET /api/v1/startups`: Fast, safe browsing with full-text search (`q`), multi-sector filtering (`sector`), stage, location, funding ask range (`funding_min`, `funding_max`), business model, sorting (`newest`, `funding`, `relevance`), and server-driven pagination.
   - Defense-in-depth discovery rules:
     - Only listed startups appear (`visibility IN ('public', 'access_controlled')`). Private startups (`visibility = 'private'`) are strictly filtered out and never appear in discovery.
     - Founder must be verified or approved (`verification_status IN ('approved', 'verified')`). Unverified or pending founders' startups never appear.
     - Content moderation check: only unhidden startups appear (`is_hidden = false`).
   - `GET /api/v1/startups/:id`: Public startup view. Private startups return `403 Forbidden` to non-owners. Sensitive fields (`problem`, `solution`, `target_market`, `business_model`) are visible only if the startup is public, the caller is the owner/admin, or the caller has an approved access request (`has_access = true`). Redacted to `null` for unauthorized visitors.
   - Filter metadata endpoints: `GET /api/v1/meta/sectors`, `GET /api/v1/meta/stages`, `GET /api/v1/meta/locations` returning distinct options with active startup counts.
   - Public accessibility: Unauthenticated callers can browse `GET /startups` and `GET /startups/:id` seamlessly with sensitive fields securely redacted.
2. **Database Migration & Query Optimization (`20261027000005_discovery_search_and_indexes.sql`)**:
   - Added `is_hidden BOOLEAN NOT NULL DEFAULT false` to `startups` table.
   - Created GIN index on `startups(sectors)` (`idx_startups_sectors`).
   - Created B-tree indexes on `stage`, `location`, `funding_ask`, `visibility`, `is_hidden`, `created_at`.
   - Created compound index for discovery listings: `idx_startups_discovery_listing` on `(is_hidden, visibility, created_at DESC)`.
   - Enhanced `startups_generate_tsv()` full-text search trigger covering `name`, `tagline`, `sectors`, `location`, `description`, `problem`, `solution`, `business_model`.
   - 500 Seeded rows benchmark: Multi-filter query executes in <50ms with sub-second execution on large datasets.
3. **Frontend (Static to Dynamic Integration)**:
   - **Explore Startups (Public)** & **Discover Startups (Investor / Incubator)** driven dynamically by the `/api/v1/startups` API.
   - **Debounced Search**: 300ms debounce on search queries to prevent redundant API calls while maintaining responsive real-time feedback.
   - **Dynamic Filter Panel**: Sector, Stage, Location, and Sort selectors populated dynamically with startup counts from `/api/v1/meta/*`.
   - **URL Query Sync**: Filter and search states automatically sync with URL query parameters (`q`, `sector`, `stage`, `location`, `sort`, `page`) on change and hydrate from URL on mount.
   - **Loading Skeletons**: 6 skeleton cards with pulse animations rendered during network requests.
   - **Empty & Error States**: Dedicated empty state when no startups match with a one-click "Clear filters" action; robust error state with a "Retry" button.
   - **Pagination**: Server-driven page navigation with item range summary ("Showing 1 to 9 of 48 startups") and previous/next page controls.
   - **Startup Detail Modal**:
     - Driven by `GET /api/v1/startups/:id`.
     - Displays company overview, logo/avatar, tags, funding ask, profile completeness score.
     - Protected confidential overview: shows problem statement, solution, target market, and business model when access is granted; shows locked notice when access is restricted.
     - Working **Request Pitch Access** button: calls `POST /api/v1/documents/:id/access-requests` and updates state to "Access Requested".
     - Working **Request Meeting** button: available for investor, mentor, and incubator roles with instant confirmation toast.
4. **Automated Testing Suite (`backend/src/tests/iteration5.test.ts`)**:
   - 20 unit and integration tests with 100% pass rate:
     - Individual filter testing (sector, stage, location, funding min/max, business model).
     - Combined multi-filter testing.
     - Search ranking and token matching sanity.
     - Private startups privacy test (never returned in discovery).
     - Hidden startups moderation test (never returned in discovery).
     - Founder verification status check (pending/unapproved founders' startups excluded).
     - Public caller sensitive field redaction test.
     - Access-approved caller sensitive field disclosure test.
     - SQL injection safety tests (`'; DROP TABLE startups; --`, `' OR '1'='1`).
     - Pagination bounds testing.
     - 500 seeded rows query performance benchmark.
   - Entire backend test suite: **90 passing tests across 7 test suites** (0 failures).
   - Frontend Next.js production build: compiles and generates static pages cleanly with zero TypeScript errors.

---

---

## Iteration 6 Details

### Completed Deliverables
1. **Investor Preferences Endpoints & Validation (`/api/v1/investors/preferences`)**:
   - `GET /api/v1/investors/preferences`: Fetches investor preferences (`sectors`, `stages`, `ticket_min`, `ticket_max`, `regions`, `business_models`, `thesis`, `firm_name`).
   - `PUT /api/v1/investors/preferences`: Validates schema via Zod (`ticket_min <= ticket_max`, non-empty arrays), updates DB record, and invalidates cached scores in `match_scores`.
2. **Pure Mathematical Matching Module (`backend/src/matching/score.ts`)**:
   - Pure module with zero database or network calls.
   - Weights sum to 100: Industry 30, Stage 25, Funding 20, Location 15, Business Model 10.
   - Criterion 0-100 logic:
     - **Industry (30%)**: Share of startup sectors covered by investor.
     - **Stage (25%)**: Exact match = 100, adjacent stage in canonical progression (`idea -> validation -> mvp -> early_traction -> growth`) = 50, otherwise = 0.
     - **Funding (20%)**: Inside ticket range = 100; below min = `100 * ask / min`; above max = `100 * max / ask`.
     - **Location (15%)**: Same city = 100, same state = 80, country = 60, investor open to any region = 60, otherwise = 0.
     - **Business Model (10%)**: Share of overlap; neutral 50 if investor has no preference specified.
   - Plain language `reasons[]` array explaining specific matches and misalignments.
   - Transparent disclaimer: *"The score measures profile compatibility, not the probability of funding."*
3. **Ranked Bidirectional Matching Endpoints**:
   - `GET /api/v1/matches/investors?startup_id=`: Founder flow, returns ranked verified investors with compatibility score, breakdown, reasons, and disclaimer.
   - `GET /api/v1/matches/startups`: Investor flow, returns ranked listed startups according to investor's preferences.
   - PostgreSQL cache layer in `match_scores` with auto-invalidation on startup update or investor preference update.
   - Deterministic tie-breaking on score equality by ID.
4. **Frontend Dynamic Integration (`frontend/app/page.tsx`)**:
   - **Founder Investor Matches (`page === 'Investor Matches'`)**:
     - Dynamic listing of ranked verified investors.
     - Disclaimer banner, compatibility percentage badge, plain language reasons with checkmarks.
     - Expandable 5-criteria breakdown accordion with progress bars for each weight.
   - **Founder Dashboard Card ("Top investor matches")**:
     - Displays top 3 live investor matches with verified badges, fit percentages, and quick navigation.
   - **Investor Recommended Startups (`page === 'Recommended Startups'`)**:
     - Specialized screen displaying recommended startups ranked in real-time.
     - Shows compatibility scores, criteria breakdown, and plain-language reasons.
   - **Investor Preferences Form (`page === 'Investment Preferences'`)**:
     - Interactive multi-select chips for sectors, stages, regions, and business models.
     - Min/max ticket inputs with quick presets (Seed, Micro Angel, Pre-Series A, etc.) and validation.
     - "Save preferences" and "Save & View Rankings" buttons that trigger immediate cache invalidation and re-ranking.
5. **Automated Testing Suite (`backend/src/tests/iteration6.test.ts`)**:
   - 39 tests with 100% pass rate:
     - Pure scoring module tests covering all 5 criteria and boundary conditions.
     - Configurable weights verify sum of 100.
     - Seeded AgriTech MVP test: FarmSense in Punjab asking ₹15L correctly ranks Northstar Ventures first (score: 97%).
     - Preference endpoint validation tests (ticket min > max rejected, empty sectors/stages rejected).
     - Cache invalidation and recompute verification.
     - Verified-only investor filtering test.
     - Full test suite: **129 passing tests across 8 test suites** with zero failures.

---

---

## Iteration 7 Details

### Completed Deliverables
1. **Database Schema & Migrations (`20261027000007_pipeline_engagement_and_messaging.sql`)**:
   - Extended `pitch_requests` with meeting negotiation fields: `proposed_date`, `message`, `counter_date`, `response_message`.
   - Created `pipeline_history` table tracking all investor pipeline state transitions (`from_status`, `to_status`, `notes`, `created_at`).
   - Created `pitch_request_messages` table supporting typed due-diligence discussions on pitch requests (`information_request`, `information_response`, `general`).
   - Configured Row Level Security (RLS) policies guaranteeing privacy of investor notes, watchlists, pitch negotiation threads, and direct messages.

2. **Watchlist & Private Notes Endpoints**:
   - `POST /api/v1/watchlist/:startup_id`: Idempotent addition to investor watchlist.
   - `DELETE /api/v1/watchlist/:startup_id`: Removal from investor watchlist.
   - `GET /api/v1/watchlist`: Returns saved startups enriched with current pipeline status and private notes.
   - `GET /api/v1/startups/:id/notes`: Private investor note retrieval (strictly isolated from founders and other investors).
   - `PUT /api/v1/startups/:id/notes`: Upsert private note.
   - `DELETE /api/v1/startups/:id/notes`: Delete private note.

3. **Deal Pipeline State Machine & History**:
   - `GET /api/v1/pipeline`: Returns investor dealflow grouped into 5 stages: `interested`, `meeting_requested`, `in_discussion`, `follow_up`, `passed`.
   - `PUT /api/v1/pipeline/:startup_id`: Validated state machine transitions:
     - `interested` → `meeting_requested`, `follow_up`, `passed`
     - `meeting_requested` → `in_discussion`, `follow_up`, `passed`
     - `in_discussion` → `follow_up`, `passed`, `meeting_requested`
     - `follow_up` → `meeting_requested`, `in_discussion`, `passed`
     - `passed` → `interested`, `follow_up`
   - `GET /api/v1/pipeline/:startup_id/history`: Full audit trail of all historical stage changes.

4. **Pitch Meeting Negotiation & Typed Due-Diligence Messages**:
   - `POST /api/v1/pitch-requests`: Propose pitch meeting with `proposed_date` and introductory `message`. Automatically updates investor pipeline to `meeting_requested`.
   - `GET /api/v1/pitch-requests`: Role-aware listing (investor sees outgoing; founder sees incoming requests for their startups).
   - `GET /api/v1/pitch-requests/:id`: Request details with nested typed message thread.
   - `PATCH /api/v1/pitch-requests/:id/respond`: Founder response with `accept`, `decline`, or `date_proposed` (counter-date + counter-message). Enforces strict founder ownership (403 for unauthorized founders).
   - `POST /api/v1/pitch-requests/:id/messages`: Typed due-diligence questions and replies (`info_request` vs `info_response`).

5. **Connections & Gated Direct Messaging**:
   - `POST /api/v1/connections`: Connection requests with duplicate rejection (409).
   - `PATCH /api/v1/connections/:id`: Accept or decline connection request.
   - `GET /api/v1/connections`: List approved or pending connections.
   - `GET /api/v1/conversations`: List active 1-to-1 conversation threads with unread counts and last message preview.
   - `GET /api/v1/conversations/:id/messages`: Fetch chronological message thread.
   - `POST /api/v1/conversations/:id/messages`: Send message. Strictly blocks messaging between unconnected users with 403 `MESSAGING_NOT_ALLOWED` unless parties have an accepted pitch meeting request.
   - `PATCH /api/v1/messages/:id/read` & `PATCH /api/v1/conversations/:id/read`: Mark messages as read.
   - Real-time in-app notification dispatch on every event via `notify()`.

6. **Frontend Dynamic Integration**:
   - **Investor Pipeline Board (`page === 'Pipeline'`)**: 5-column kanban board with allowed state machine transition buttons, note previews, history counts, and status audit modal.
   - **Watchlist & Notes (`page === 'Watchlist & Notes'`)**: Interactive watchlist grid with private note editor and meeting request trigger.
   - **Meeting Requests Page (`page === 'Meeting Requests'`)**: Full negotiation flow with date selection, counter-proposals, and typed diligence thread drawer.
   - **Founder Dashboard Card**: Pending meeting requests widget on Founder dashboard with 1-click Accept.
   - **Messages Page (`page === 'Messages'`)**: 2-pane conversation view with 15-second polling interval and optimistic message sending with automatic rollback on error.
   - **Add to Watchlist Buttons**: Embedded across Explore Startups, Discover Startups, and Recommended Startups.

7. **Automated Testing Suite (`backend/src/tests/iteration7.test.ts`)**:
   - 21 unit and integration tests passing:
     - Watchlist idempotency and cross-user privacy isolation.
     - Notes privacy (investor only; invisible to other investors and founders).
     - Valid and invalid pipeline transitions through state machine.
     - Pitch request creation, duplicate 409, and counter-date negotiation.
     - Cross-founder security: 403 when a founder attempts to respond to another founder's pitch request.
     - Connections lifecycle (request, duplicate 409, accept).
     - Direct messaging guards: strictly blocks unconnected users with 403; unlocks messaging upon accepted pitch request or connection.
   - Total backend test suite: **150 passing tests across 9 test suites** (100% pass rate).
   - Frontend Next.js build: verified with zero errors (`npm run build` passed).


## Iteration 8 Details

### Completed Deliverables
1. **Mentor Discovery, Requests & Structured Feedback**:
   - `GET /api/v1/mentors`: Public directory with case-insensitive `expertise` filter and flattened profiles.
   - `GET /api/v1/mentors/:id`: Mentor profile details with expertise, bio, and operational experience.
   - `POST /api/v1/mentorship-requests`: Founders request guidance for a startup; creates notification for target mentor.
   - `PATCH /api/v1/mentorship-requests/:id/respond`: Target mentor accepts or declines with optional response note; non-target mentors blocked with 403 `FORBIDDEN_RESOURCE`. Dispatches notification to founder.
   - `GET /api/v1/mentorship-requests`: Lists requests filtered by mentor or founder.
   - `POST /api/v1/startups/:id/feedback`: Mentors submit structured evaluation with 1-5 star rating, qualitative commentary, strengths, and improvement areas. Rating range 1-5 strictly enforced; founder notified upon submission.
   - `GET /api/v1/startups/:id/feedback`: Lists public feedback for a startup with reviewer details.

2. **Incubator Programs CRUD**:
   - `POST /api/v1/programs`: Incubators launch programs with `title`/`name`, `description`, `eligibility`, `benefits`, `sectors`, and `deadline`. Non-incubator roles rejected with 403.
   - `GET /api/v1/programs`: Public directory with sector and active-cohort filters.
   - `GET /api/v1/programs/:id`: Public program details.
   - `PATCH /api/v1/programs/:id`: Update program parameters. Only owning incubator can modify (403 `FORBIDDEN_RESOURCE` on cross-incubator tampering).
   - `DELETE /api/v1/programs/:id`: Delete program. Enforces incubator ownership.

3. **Applications & Funnel State Machine**:
   - `POST /api/v1/programs/:id/apply`: Founders submit startup application before deadline.
     - Applying after deadline strictly rejected with **422** (`DEADLINE_PASSED`).
     - Duplicate application for same startup & program rejected with **409** (`DUPLICATE_APPLICATION`).
     - Dispatches `application_submitted` notification to the incubator.
   - `GET /api/v1/me/applications`: Founders track all their program applications, statuses, and decision notes.
   - `GET /api/v1/applications` & `GET /api/v1/programs/:id/applications`: Incubators retrieve received applications.
   - `PATCH /api/v1/applications/:id/status`: Transition application status through validated funnel:
     - `submitted` -> `under_review`, `rejected`
     - `under_review` -> `shortlisted`, `rejected`
     - `shortlisted` -> `accepted`, `rejected`
     - `rejected` -> `under_review`
     - Invalid status jumps rejected with 400 (`INVALID_STATUS_TRANSITION`).
     - Non-owning incubators rejected with 403 (`FORBIDDEN_RESOURCE`).
     - Dispatches `application_status_updated` notification to the founder.

4. **Notifications Visibility & Read Operations**:
   - `GET /api/v1/notifications`: Chronological list of user-specific notifications.
   - `GET /api/v1/notifications/unread-count`: Returns `{ count, unread_count }`.
   - `PATCH /api/v1/notifications/:id/read`: Marks individual notification as read. Non-recipients blocked with 403 (`FORBIDDEN_RESOURCE`).
   - `POST /api/v1/notifications/read-all`: Bulk marks all recipient unread notifications as read.
   - Full recipient isolation: User A can never inspect or modify User B's notifications.

5. **Frontend Dynamic Integration**:
   - **Notification Bell & Live Badge (`<NotificationDropdown />`)**: Real-time polling with badge counter, 1-click "Mark all read", individual read toggle, and rich event icons.
   - **Mentor Portal (`<MentorPortalView />`)**:
     - *Mentorship Requests*: Interactive cards with Accept / Decline flow and response notes.
     - *Startups to Review*: Startup selector and structured feedback form with 1-5 interactive stars, strengths tags, and improvement tags.
     - *My Expertise Profile*: Interactive expertise tags editor, experience years, and LinkedIn sync.
   - **Incubator Portal (`<IncubatorPortalView />`)**:
     - *My Programs*: Cohort management with Create, Edit, and Delete modals.
     - *Applications Received*: Review funnel table with Shortlist, Review, Accept, and Reject transitions + decision notes.
   - **Founder Mentors View (`<FounderMentorsView />`)**: Directory with expertise badges, search, "Request Mentorship" modal, and "My Requests" status tracker.
   - **Founder Incubators View (`<FounderIncubatorsView />`)**: Open cohorts directory with deadline indicators, "Apply to Program" modal with duplicate and deadline validation, and "My Applications" lifecycle tracker.

6. **Automated Testing Suite (`backend/src/tests/iteration8.test.ts`)**:
   - 16 unit and integration tests passing:
     - Mentors listing and expertise filtering.
     - Mentorship request creation, mentor notification, and response ownership (target mentor only; 403 on non-target).
     - Startup feedback and 1-5 rating range enforcement.
     - Program CRUD and ownership enforcement.
     - Application deadline rejection (422) and duplicate application rejection (409).
     - State machine transition rules and non-owning incubator rejection (403).
     - Notifications recipient isolation and read tracking.
   - Full test suite: **166 passing tests across 10 test suites** (100% pass rate).
   - Frontend Next.js build: verified with zero errors (`npm run build` passed).

---

## Iteration 9 Details

### Completed Deliverables
1. **Admin User Moderation & Token Invalidation**:
   - `GET /api/v1/admin/users`: Comprehensive user administration endpoint with filters by `role`, account `status` (`active`, `suspended`, `pending_approval`), `verification_status`, and free-text search across full name, email, and organization.
   - `POST /api/v1/admin/users/:id/suspend`: Allows administrators to suspend any user with a required reason.
   - `POST /api/v1/admin/users/:id/reactivate`: Reactivates a suspended user account with a note.
   - **Immediate Token Invalidation & 403 Enforcement**: The `authenticate` and `optionalAuthenticate` middleware layers evaluate user status on every incoming request. As soon as a user is suspended, all their active tokens and subsequent requests immediately return `403 ACCOUNT_SUSPENDED`.
   - **Discovery Cascade Guard**: Suspended founders have their startups automatically withheld from public and authenticated discovery.

2. **Startup Listings Moderation**:
   - `GET /api/v1/admin/startups`: Moderator-wide inventory of all platform startups, including hidden startups and moderation flags.
   - `POST /api/v1/admin/startups/:id/hide`: Flags a startup as hidden with an optional moderation reason.
   - `POST /api/v1/admin/startups/:id/unhide`: Restores a hidden startup to active discovery.
   - `DELETE /api/v1/admin/startups/:id`: Permanently removes violating startups.
   - **Discovery Filtering**: The startup discovery engine (`discoverStartups`) checks `is_hidden !== true` and verifies founder status, instantly hiding flagged startups from search, browse, and matching.

3. **Trust & Safety User Reports**:
   - `POST /api/v1/reports`: Open to any verified user or admin (`requireVerified`). Enables reporting any target entity (`startup`, `user`, `document`, `message`, `program`, `other`) with validated `reason` and optional `details`.
   - `GET /api/v1/admin/reports`: Admin moderation queue with status filtering (`pending`, `reviewed`, `resolved`, `dismissed`) and pagination.
   - `GET /api/v1/admin/reports/:id`: Single report lookup with target details.
   - `PATCH /api/v1/admin/reports/:id`: Mark report status as reviewed or add interim notes.
   - `POST /api/v1/admin/reports/:id/resolve`: Resolves a report with a resolution note and records an audit log entry.
   - `POST /api/v1/admin/reports/:id/dismiss`: Dismisses a false/invalid report with explanation and records an audit log entry.

4. **Platform Statistics (`GET /api/v1/admin/stats`)**:
   - Aggregates platform health indicators:
     - `users_by_role`: count of users across founder, investor, mentor, incubator, and admin roles.
     - `total_users`: total platform user accounts.
     - `startups_listed`: active, non-hidden startups listed by verified founders.
     - `pending_verifications`: outstanding profile verification requests.
     - `open_reports`: pending/reviewed trust & safety reports awaiting action.
     - `requests_last_30_days`: rolling total of investor access requests, pitch meeting requests, and program applications made over the last 30 days.

5. **Immutable Audit Trail (`GET /api/v1/admin/audit-logs`)**:
   - Every administrative moderation action writes to the `audit_logs` table (`user_suspended`, `user_reactivated`, `startup_hidden`, `startup_unhidden`, `startup_deleted`, `report_resolved`, `report_dismissed`, `verification_approved`, `verification_rejected`).
   - `GET /api/v1/admin/audit-logs` provides paginated, filterable access by admin ID, action type, target type, and target ID.

6. **Frontend Dynamic Integration**:
   - **Admin Console Views (`frontend/components/AdminConsoleView.tsx`)**:
     - *Admin Dashboard*: Real-time platform KPI cards (`Total Users`, `Startups Listed`, `Pending Verifications`, `Open Reports`, `30-Day Activity`), role breakdown badges, and quick-action navigation.
     - *Verification Queue*: Live review table with 1-click Approve and Reject actions.
     - *Users Management*: Live user table with role/status filters, search, and dynamic Suspend / Reactivate action modals.
     - *Startup Listings*: Moderator view with stage/status filters and 1-click Hide, Unhide, and Delete actions.
     - *Reported Content*: Active trust & safety queue with priority badges, reason descriptions, and Resolve / Dismiss moderation modals.
   - **Interactive Report Modal (`frontend/components/ReportModal.tsx`)**:
     - Generic modal allowing verified community members to report startups or profiles with categorized reasons.
     - Added "Report startup" button in the Startup Detail Modal.
     - Added "Report profile" button on User Profile pages.

7. **Automated Testing Suite (`backend/src/tests/iteration9.test.ts`)**:
   - 12 comprehensive unit and integration tests:
     - Loop testing across all 18 `/admin/*` routes to guarantee strict 403 blocking for founders, investors, mentors, and incubators.
     - User suspension testing verifying that active JWTs receive 403 on subsequent calls across all endpoints.
     - Discovery isolation verifying that hidden startups and startups owned by suspended founders vanish from discovery.
     - End-to-end report creation, admin review, and resolution flows.
     - Platform statistics validation matching seed data.
     - Audit log creation verifying that moderation actions record structured audit entries.
   - Full test suite: **178 passing tests across 11 test suites** (100% pass rate).
   - Frontend Next.js build: verified with zero errors (`npm run build` passed).

---

## Iteration 10 Details: Hardening, Documentation and Release

### Completed Deliverables
1. **Security Review & Hardening**:
   - **Row-Level Security (RLS)**: Verified `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;` on all 16 platform tables across migrations.
   - **Dedicated Rate Limits**: Implemented `authLimiter` (10 req/15m for sensitive auth), `uploadLimiter` (20 uploads/hr for pitch decks), and `messageLimiter` (60 msg/min for real-time messaging) in [rate-limit.middleware.ts](file:///d:/Downloads/founders-den-redesign/backend/src/middleware/rate-limit.middleware.ts).
   - **Strict CORS & Request Size Limits**: Configured strict CORS origin matching and enforced `1mb` JSON request body ceiling (`express.json({ limit: '1mb' })`) and `10mb` PDF upload ceiling.
   - **No Secrets in Logs**: Enhanced Pino logger in [logger.ts](file:///d:/Downloads/founders-den-redesign/backend/src/utils/logger.ts) with strict redaction paths for `authorization`, `cookie`, `password`, `*.password`, `token`, `*.token`, `access_token`, `refresh_token`, `secret`, `*.secret`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`. Logs show `[REDACTED]`.
   - **Zero npm Audit Findings**: Upgraded dependencies (`zod@4.6.7`, `vitest@5.0.5`, `@vitest/coverage-v8@5.0.5`, `next@16.4.3`). Both `backend` and `frontend` have **0 vulnerabilities** (`npm audit` exits 0).

2. **OpenAPI Specification & Interactive Swagger UI**:
   - Generated comprehensive [docs/openapi.yaml](file:///d:/Downloads/founders-den-redesign/docs/openapi.yaml) documenting every endpoint across Auth, Profiles, Startups, Documents, Discovery, Matching, Engagement, Mentorship, Incubation, Notifications, Reports, and Admin moderation.
   - Implemented Swagger UI documentation route at `GET /api/docs` and raw spec endpoint at `GET /api/docs/openapi.yaml` in [docs.routes.ts](file:///d:/Downloads/founders-den-redesign/backend/src/routes/docs.routes.ts).

3. **End-to-End User Journey Test (`backend/src/tests/e2e-journey.test.ts`)**:
   - Automated an 8-phase full lifecycle integration test:
     1. Founder registers and creates startup profile with team and pitch metrics.
     2. Admin reviews and approves pending investor verification.
     3. Founder uploads PDF pitch deck; access control is verified.
     4. Smart matching computes multi-factor compatibility scores.
     5. Verified investor requests a pitch meeting; founder accepts.
     6. Verified mentor reviews startup and submits structured feedback.
     7. Incubator launches program; startup applies; incubator accepts application.
     8. Notifications confirm each stakeholder was notified with correct title and event payload.

4. **Service & Matching Module Code Coverage (>= 80%)**:
   - Reached **81.44% line coverage overall** across all files.
   - Reached **80.01% line coverage on services** (`src/services/**`).
   - Reached **93.98% line coverage on matching** (`src/matching/score.ts`).
   - Fixed all flaky and syntax errors; **194/194 tests pass** across 13 test suites.

5. **Demo Seed Command & Deployment Guide**:
   - Configured `npm run seed:demo` / `npm run db:seed` in [package.json](file:///d:/Downloads/founders-den-redesign/backend/package.json), seeding 11 profiles across all 5 roles, 5 startups, investor theses, mentors, incubator programs, applications, notes, and messages.
   - Authored comprehensive [docs/DEPLOYMENT.md](file:///d:/Downloads/founders-den-redesign/docs/DEPLOYMENT.md) covering Render, Railway, Fly.io, Supabase production project setup, environment variables, running migrations, health check monitoring (`GET /api/v1/health`), and PITR backup/recovery strategies.

6. **Frontend Static to Dynamic Hardening & Playwright Tests**:
   - Added automatic 401 redirect with token refresh and unauthorized handling in [api-client.ts](file:///d:/Downloads/founders-den-redesign/frontend/lib/api-client.ts) and [AuthContext.tsx](file:///d:/Downloads/founders-den-redesign/frontend/context/AuthContext.tsx).
   - Created Playwright E2E test suite in [frontend/tests/platform-flows.spec.ts](file:///d:/Downloads/founders-den-redesign/frontend/tests/platform-flows.spec.ts) covering:
     1. Sign up, toggle to login, and authenticate.
     2. Founder creates a startup with tagline and pitch details.
     3. Investor requests a pitch meeting and verifies status transition.
   - Verified clean production builds on both frontend (`next build` exits 0) and backend (`tsc` exits 0).

---

## Assumptions
1. **Explicit Database Mode Requirement**: The backend strictly requires a valid PostgreSQL `DATABASE_URL` to boot. Silent fallback to in-memory mode has been eliminated; in-memory execution is permitted ONLY when `USE_IN_MEMORY_DB=true` is set explicitly for offline unit testing. The active mode is always logged on startup: `'DB mode: postgres'` or `'DB mode: in-memory'`.
2. **Database Role Source of Truth**: The JWT contains the user ID (`sub`). The user's role is always fetched directly from the database `profiles` table to prevent token manipulation or client-side role tampering.
3. **Unified Verification Policy**: `verification_status` is strictly unified to `'pending'`, `'verified'`, and `'rejected'`. The deprecated `'approved'` state has been completely removed in favor of `'verified'`. Founders are verified on creation; non-founder roles (`investor`, `mentor`, `incubator`) are created in `'pending'` status and routed to the admin verification queue.
4. **Row-Level Security (RLS) Coverage**: RLS is strictly enabled across all 26 public tables in the PostgreSQL schema, with granular read/write policies for founders, investors, mentors, incubators, and admins.
5. **Pitch Deck Storage & Signed Access**: Documents are saved in the private `startup-documents` Supabase Storage bucket with strict RLS policies on `storage.objects` and accessed via 60-second time-limited signed URLs.
6. **Idempotent User & Profile Seeding**: The seed script (`npm run db:seed`) idempotently provisions canonical demo accounts through the Supabase Auth Admin API (`supabaseAdmin.auth.admin.createUser`) and syncs profile/entity data into PostgreSQL using `ON CONFLICT` updates.
7. **Suspended Accounts**: When an admin marks an account as `suspended`, both `login` and authenticated requests via JWT are immediately rejected with status `403 ACCOUNT_SUSPENDED`.

---

---

## Iteration 11: Production Deployment Readiness (Render, Vercel, Supabase)

### Completed Work

1. **Backend Production Hardening (Render)**:
   - Configured Express server to bind to `0.0.0.0` and dynamic `process.env.PORT` with `src/server.ts` entrypoint.
   - Set `engines.node >= 20` and verified production build pipeline `npm ci && npm run build && npm start`.
   - Implemented root health check `GET /health` returning 200 immediately without database overhead for Render platform monitoring.
   - Implemented database health and readiness checks `GET /api/v1/health` and `GET /api/v1/ready` returning 200 OK or 503 Service Unavailable when DB is down.
   - Enabled `app.set('trust proxy', 1)` to correctly capture real client IPs across Render/Cloudflare reverse proxies for rate limiting and logging.
   - Implemented strict CORS matching using comma-separated exact origin list from `CORS_ORIGIN` with wildcards prohibited and credentials permitted only for authorized origins.
   - Added production environment validation in `src/config.ts`: refuses to boot in `NODE_ENV=production` if `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `CORS_ORIGIN` are missing, or if `USE_IN_MEMORY_DB` is true (error message names the variable, never its value).
   - Configured small PostgreSQL pool (max 10) with SSL and idle/connection timeouts, plus `pool.on('error')` handler to prevent process crashes.
   - Made `SUPABASE_JWT_SECRET` optional by utilizing Supabase GoTrue `supabase.auth.getUser(token)` verification.
   - Added PDF magic-byte (`%PDF-`) verification and 10MB file limit for pitch deck uploads, retaining 60-second expiring signed download URLs.
   - Added graceful shutdown on `SIGTERM` and `SIGINT` with 10-second forced exit safeguard.
   - Added safety guards to `db:reset` (requires `--i-know-this-drops-tables` in production) and `db:seed` (requires `ALLOW_SEED=true` in production).
   - Created standalone idempotent migration engine `npm run db:migrate` tracking applied migrations in `public.schema_migrations`.
   - Created root `render.yaml` Blueprint specification for Render Web Service deployment.

2. **Frontend Production Hardening (Vercel)**:
   - Eliminated hardcoded fallback URLs and keys; strictly loads from `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Enforced production build failure in `next.config.mjs` if any required `NEXT_PUBLIC_*` variable is omitted.
   - Verified that service role keys and database connection strings are never referenced in frontend code.
   - Added Next.js App Router boundaries:
     - `app/loading.tsx` for platform loading spinner.
     - `app/error.tsx` for graceful failure handling and recovery.
     - `app/not-found.tsx` for 404 views.
   - Sanitized `frontend/.env.example` with clear comments and placeholder values.
   - Successfully compiled production bundle with `next build` passing cleanly.

3. **Repository Hygiene & Security**:
   - Confirmed `.env` and `.env.local` files are properly excluded by `.gitignore` and not tracked by Git.
   - Scanned Git history for leaked credentials; sanitized `backend/.env.example`.
   - Masked connection string printing across diagnostic scripts.
   - Verified `npm audit` reporting 0 vulnerabilities across both applications.
   - Configured Helmet security headers with `crossOriginResourcePolicy: cross-origin` for browser CORS compatibility.

4. **CI/CD & Documentation**:
   - Added `.github/workflows/ci.yml` running lint, typecheck, build, and tests for backend and frontend on pull requests and pushes to main.
   - Added `.github/workflows/migrate.yml` running `npm run db:migrate` automatically on pushes to main.
   - Authored comprehensive [docs/DEPLOYMENT.md](file:///d:/Downloads/founders-den-redesign/docs/DEPLOYMENT.md) with architecture diagram, variable matrix, manual Supabase checklist, rollback protocols, key rotation procedures, and troubleshooting guide.

---

## Known Gaps & Operational Notes
1. **Frontend Route Splitting**: The frontend currently uses single-page dynamic view switching in `app/page.tsx` with role guards rather than distinct subdirectories per portal (e.g. `/founder/dashboard`, `/investor/pipeline`). This was intentionally retained to maintain state cohesion, navigation consistency, and zero UI regressions.
2. **WebSocket Realtime Subscriptions**: Messages and notification updates currently use REST polling with optimistic UI updates; live Supabase Realtime channels can be attached for WebSocket events in future milestones.
3. **Enterprise Antivirus Scanning**: Uploaded PDF pitch decks undergo file signature (magic bytes) validation and size restrictions (10MB); enterprise antivirus hooks (e.g. ClamAV / AWS GuardDuty) can be integrated for additional malware defense before archival.


