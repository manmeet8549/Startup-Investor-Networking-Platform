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
