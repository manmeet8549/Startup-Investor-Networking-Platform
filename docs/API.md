# Founders Den API Documentation

## Overview
- **Base URL**: `/api/v1`
- **Protocol**: JSON only, all request and response bodies use `snake_case` fields.
- **Authentication**: Supabase JWT in the `Authorization: Bearer <token>` header.
- **Role Enforcement**: User roles (`founder`, `investor`, `mentor`, `incubator`, `admin`) are always read directly from the database, never trusted from client payloads or token claims.
- **Pagination**: List endpoints accept `page` (default 1) and `limit` (default 20, max 100), returning pagination metadata in `meta`.

---

## Response Envelopes

### Success Envelope
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload validation failed",
    "details": [
      {
        "field": "email",
        "message": "Valid email address required"
      }
    ]
  }
}
```

### Standard HTTP Status Codes
| Status | Meaning | Usage |
|---|---|---|
| `200` | OK | Successful fetch, update, or login |
| `201` | Created | Successful entity creation / sign up |
| `400` | Bad Request | Malformed request |
| `401` | Unauthorized | Missing, invalid, or expired JWT token |
| `403` | Forbidden | Insufficient permissions (e.g. non-admin) or suspended account |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Duplicate resource (e.g. email already registered) |
| `422` | Unprocessable Entity | Zod schema validation failure |
| `429` | Too Many Requests | Rate limit exceeded |

---

## Endpoints (Iteration 1)

### 1. Health Check
- **`GET /api/v1/health`**
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "data": {
    "status": "ok",
    "service": "founders-den-backend",
    "timestamp": "2026-10-27T00:15:00.000Z",
    "version": "1.0.0"
  }
}
```

---

### 2. User Authentication & Profile Registration

#### `POST /api/v1/auth/signup`
Registers a new user and returns their profile with a signed JWT.
- **Auth**: None
- **Request Body**:
```json
{
  "email": "manmeet@example.com",
  "password": "SecurePassword123!",
  "full_name": "Manmeet Singh",
  "role": "founder",
  "is_student": true,
  "organization": "FarmSense",
  "bio": "Building agricultural intelligence",
  "location": "Ludhiana, India",
  "website": "https://farmsense.example.com"
}
```
- **Validation Rules**:
  - `role`: One of `'founder'`, `'investor'`, `'mentor'`, `'incubator'`, `'admin'`.
  - `is_student`: Boolean flag (profile flag indicating student innovator status).
  - Note: Non-founder roles (`investor`, `mentor`, `incubator`) automatically initialize with `verification_status: "pending"` and are enqueued for admin review. Founders initialize with `verification_status: "verified"`.
- **Response**: `201 Created`
```json
{
  "data": {
    "user": {
      "id": "e4f3a74b-1234-4a2e-8390-1c9f7a63b012",
      "email": "manmeet@example.com",
      "full_name": "Manmeet Singh",
      "role": "founder",
      "is_student": true,
      "organization": "FarmSense",
      "avatar_url": null,
      "bio": "Building agricultural intelligence",
      "location": "Ludhiana, India",
      "website": "https://farmsense.example.com",
      "status": "active",
      "verification_status": "verified",
      "created_at": "2026-10-27T00:15:00.000Z",
      "updated_at": "2026-10-27T00:15:00.000Z"
    },
    "token": "eyJhbGciOi..."
  }
}
```

#### `POST /api/v1/auth/login`
Authenticates a user and returns their profile and JWT session token.
- **Auth**: None
- **Request Body**:
```json
{
  "email": "manmeet@foundersden.test",
  "password": "Password123!"
}
```
- **Response**: `200 OK`
```json
{
  "data": {
    "user": { ... },
    "token": "eyJhbGciOi..."
  }
}
```

#### `GET /api/v1/auth/me`
Retrieves the currently authenticated user's profile directly from the database.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "f0000000-0000-0000-0000-000000000001",
    "email": "manmeet@foundersden.test",
    "full_name": "Manmeet Singh",
    "role": "founder",
    "is_student": true,
    "organization": "FarmSense",
    "avatar_url": null,
    "bio": "Building FarmSense: Practical intelligence for every farmer.",
    "location": "Ludhiana, India",
    "website": "https://farmsense.example.com",
    "status": "active",
    "verification_status": "verified",
    "created_at": "2026-10-18T10:00:00.000Z",
    "updated_at": "2026-10-18T10:00:00.000Z"
  }
}
```

#### `PATCH /api/v1/auth/me`
Updates editable fields on the authenticated user's profile. Escalation of `role` or `verification_status` is blocked.
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "full_name": "Manmeet S.",
  "is_student": true,
  "organization": "FarmSense Technologies",
  "bio": "Updated bio...",
  "location": "Chandigarh, India",
  "website": "https://farmsense.example.com"
}
```
- **Response**: `200 OK`
```json
{
  "data": { ... }
}
```

---

### 3. Profiles

#### `GET /api/v1/profiles/:id`
Retrieves a public profile by its UUID.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "f0000000-0000-0000-0000-000000000001",
    "email": "manmeet@foundersden.test",
    "full_name": "Manmeet Singh",
    "role": "founder",
    "is_student": true,
    "organization": "FarmSense",
    "avatar_url": null,
    "bio": "Building FarmSense: Practical intelligence for every farmer.",
    "location": "Ludhiana, India",
    "website": "https://farmsense.example.com",
    "status": "active",
    "verification_status": "verified"
  }
}
```

---

### 4. Admin Management & Moderation

#### `GET /api/v1/admin/users`
Lists all users with optional filtering and pagination.
- **Auth**: `Bearer <token>` (Admin role strictly required)
- **Query Parameters**:
  - `page`: Integer (default 1)
  - `limit`: Integer (default 20, max 100)
  - `search`: String (searches full name, email, organization)
  - `role`: One of `'founder'`, `'investor'`, `'mentor'`, `'incubator'`, `'admin'`
  - `status`: One of `'active'`, `'suspended'`
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "f0000000-0000-0000-0000-000000000001",
      "email": "manmeet@foundersden.test",
      "full_name": "Manmeet Singh",
      "role": "founder",
      "is_student": true,
      "status": "active",
      "verification_status": "verified"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 6,
    "total_pages": 1
  }
}
```

#### `PATCH /api/v1/admin/users/:id/status`
Updates a user's status (`active` or `suspended`), role, or verification status.
- **Auth**: `Bearer <token>` (Admin role strictly required)
- **Request Body**:
```json
{
  "status": "suspended"
}
```
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "f0000000-0000-0000-0000-000000000002",
    "status": "suspended"
  }
}
```

#### `GET /api/v1/admin/verifications`
Lists verification requests submitted by non-founder profiles.
- **Auth**: `Bearer <token>` (Admin role strictly required)
- **Query Parameters**:
  - `page`: Integer (default 1)
  - `limit`: Integer (default 20, max 100)
  - `status`: One of `'pending'`, `'verified'`, `'rejected'`
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "e0000000-0000-0000-0000-000000000001",
      "user_id": "i0000000-0000-0000-0000-000000000001",
      "role_requested": "investor",
      "organization": "Northstar Ventures",
      "supporting_notes": "Seed fund managing ₹50Cr active portfolio in India.",
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "admin_notes": null,
      "created_at": "2026-10-25T11:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

#### `PATCH /api/v1/admin/verifications/:id`
Approves or rejects a verification request. Automatically synchronizes the target user's `verification_status`.
- **Auth**: `Bearer <token>` (Admin role strictly required)
- **Request Body**:
```json
{
  "status": "verified",
  "admin_notes": "Valid registered SEBI fund documentation verified."
}
```
- **Response**: `200 OK`
```json
{
  "data": {
    "request": {
      "id": "e0000000-0000-0000-0000-000000000001",
      "status": "verified",
      "reviewed_by": "a0000000-0000-0000-0000-000000000001",
      "reviewed_at": "2026-10-27T00:18:00.000Z",
      "admin_notes": "Valid registered SEBI fund documentation verified."
    },
    "user": {
      "id": "i0000000-0000-0000-0000-000000000001",
      "verification_status": "verified"
    }
  }
}
```

---

## Iteration 3: Authentication, Roles, Profiles & Admin Verification

### 1. Supabase Auth Integration & Flows

Credentials and core auth lifecycle events are managed using **Supabase Auth (`@supabase/supabase-js`)**.

#### A. Sign-up & Email Confirmation Flow
1. **Frontend Registration**:
   - The user selects their role (`founder`, `investor`, `mentor`, `incubator`) via the UI role picker.
   - The browser invokes `supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })`.
   - Supabase Auth creates the credential record in `auth.users` and dispatches a verification email containing a confirmation link with an HMAC token.
2. **Profile Creation**:
   - The client (or server webhook) invokes `POST /api/v1/auth/register-profile` with the registration details.
   - If the role is `founder`: The account is immediately marked `verification_status: "verified"`.
   - If the role is `investor`, `mentor`, or `incubator`: The account is set to `verification_status: "pending"` and enqueued in `verification_requests`.
   - Requesting `role: "admin"` is strictly prohibited and returns `403 FORBIDDEN`.
3. **Email Confirmation**:
   - Clicking the verification link confirms `email_confirmed_at` in Supabase Auth.
   - Supabase redirects the user to the configured callback route with an access token / refresh token hash.

#### B. Password Reset Flow
1. **Initiation**:
   - User inputs their email on the Forgot Password modal and submits.
   - Frontend invokes `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?type=recovery` })`.
2. **Email Delivery**:
   - Supabase Auth emails a cryptographically secure, time-limited recovery link containing an access OTP.
3. **Password Update**:
   - The recovery link directs the user back to the application with a temporary recovery session.
   - The frontend detects the `PASSWORD_RECOVERY` auth event from `supabase.auth.onAuthStateChange`.
   - The user enters their new password, which is committed via `supabase.auth.updateUser({ password: newPassword })`.
   - The password is updated using bcrypt/Argon2 hashing, and old sessions are invalidated.

---

### 2. Authentication & Authorization Middleware

1. **`authenticate`**:
   - Extracts `Bearer <token>` from the `Authorization` header.
   - Verifies the signature using `SUPABASE_JWT_SECRET`.
   - Queries the database for the active profile matching `sub` (user ID).
   - Rejects missing or tampered tokens with `401 UNAUTHORIZED`.
   - Rejects expired tokens with `401 TOKEN_EXPIRED`.
   - Rejects suspended accounts with `403 ACCOUNT_SUSPENDED`.
2. **`requireRole(...roles)`**:
   - Inspects `req.user.role` loaded from the database.
   - Rejects unauthorized roles with `403 FORBIDDEN`.
3. **`requireVerified`**:
   - Rejects accounts with `verification_status !== 'verified'` (except for `admin`) with `403 UNVERIFIED_ACCOUNT`.

---

### 3. Profile & Role Endpoints

#### `POST /api/v1/auth/register-profile`
Registers a profile and role-specific sub-record after Supabase Auth sign-up.
- **Auth**: None (or Supabase Auth session)
- **Request Body**:
```json
{
  "email": "investor@example.com",
  "password": "SecurePassword123!",
  "full_name": "Vikram Seth",
  "role": "investor",
  "organization": "Apex Capital",
  "is_student": false
}
```
- **Response**: `201 Created`
```json
{
  "data": {
    "user": {
      "id": "i0000000-0000-0000-0000-000000000001",
      "email": "investor@example.com",
      "full_name": "Vikram Seth",
      "role": "investor",
      "verification_status": "pending"
    },
    "token": "eyJhbGciOiJIUzI1Ni...",
    "verification_request": {
      "id": "e0000000-0000-0000-0000-000000000001",
      "role_requested": "investor",
      "status": "pending"
    }
  }
}
```

#### `GET /api/v1/me`
Retrieves current authenticated profile.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `PATCH /api/v1/me`
Updates editable fields on user profile. Attempted role escalation (`role` field) is ignored/blocked.
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "full_name": "Vikram Seth, Managing Partner",
  "bio": "Early stage FinTech & AgriTech investor",
  "location": "Bengaluru, India",
  "website": "https://apexcap.example.com"
}
```
- **Response**: `200 OK`

#### Role-Specific Profile Endpoints
All role profile endpoints require `authenticate`:
- **`GET /api/v1/me/founder-profile`** & **`PUT /api/v1/me/founder-profile`**
- **`GET /api/v1/me/investor-profile`** & **`PUT /api/v1/me/investor-profile`**
- **`GET /api/v1/me/mentor-profile`** & **`PUT /api/v1/me/mentor-profile`**
- **`GET /api/v1/me/incubator-profile`** & **`PUT /api/v1/me/incubator-profile`**

Example Investor Profile Update (`PUT /api/v1/me/investor-profile`):
```json
{
  "firm_name": "Apex Capital",
  "investment_thesis": "Seed and Series A AgriTech & Climate Tech ventures",
  "min_ticket_size": 1000000,
  "max_ticket_size": 5000000,
  "target_sectors": ["AgriTech", "Climate Tech"],
  "target_stages": ["Seed", "Early traction"]
}
```

---

### 4. Admin Verification Endpoints & Audit Logging

#### `GET /api/v1/admin/verifications`
Filters pending or reviewed applications by `role` and `status`.
- **Auth**: `Bearer <token>` (`admin` role required)
- **Query Params**: `?role=investor&status=pending`

#### `POST /api/v1/admin/verifications/:id/approve`
Approves an applicant, updates their `verification_status` to `verified`, and logs the action to `audit_logs`.
- **Auth**: `Bearer <token>` (`admin` role required)
- **Request Body**:
```json
{
  "notes": "Verified SEBI angel network membership"
}
```
- **Response**: `200 OK`

#### `POST /api/v1/admin/verifications/:id/reject`
Rejects an applicant with a mandatory rejection reason, sets status to `rejected`, and writes an audit log.
- **Auth**: `Bearer <token>` (`admin` role required)
- **Request Body**:
```json
{
  "reason": "Provided fund registration number could not be verified on the regulator registry."
}
```
- **Response**: `200 OK`

#### Audit Logging (`audit_logs`)
Every administrative action (`VERIFICATION_APPROVED`, `VERIFICATION_REJECTED`, `USER_SUSPENDED`, `USER_ACTIVATED`) is permanently recorded in `audit_logs` with:
- `actor_id`: Admin's user UUID.
- `action`: Action identifier.
- `target_type`: E.g. `verification_request`, `user`.
- `target_id`: ID of target entity.
- `metadata`: JSON payload containing rejection reason, approval notes, or status changes.
- `created_at`: Timestamp.

---

## Endpoints (Iteration 4: Startup Profiles, Pitch Decks & Access Control)

### 1. Founder Startup Management

#### `POST /api/v1/startups`
Creates a new startup profile.
- **Auth**: `Bearer <token>` (`founder` or `admin` role required)
- **Request Body**:
```json
{
  "name": "FarmSense AI",
  "logo": "https://images.unsplash.com/photo-farm.png",
  "tagline": "AI-powered precision agriculture for smallholder farmers",
  "sectors": ["AgriTech", "AI"],
  "stage": "mvp",
  "problem": "Crop yield unpredictability causes 40% income loss annually.",
  "solution": "IoT micro-sensors and AI satellite analysis predict irrigation and harvest cycles.",
  "target_market": "120M smallholder farmers in South Asia",
  "business_model": "Hardware subscription + farm advisory SaaS",
  "funding_ask": 2500000,
  "currency": "INR",
  "location": "Ludhiana, Punjab, India",
  "visibility": "access_controlled"
}
```
- **Response**: `201 Created`
  - Returns startup object including computed `profile_completeness` (0-100%).

#### `GET /api/v1/me/startups`
Retrieves all startups owned by the authenticated user.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK` (Array of startups with computed `profile_completeness`)

#### `GET /api/v1/startups/:id`
Retrieves startup details with visibility enforcement:
- `public`: any verified user or owner/admin.
- `access_controlled`: visible if approved or if owner/admin.
- `private`: owner and admin only.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `PATCH /api/v1/startups/:id`
Updates startup profile fields. Only the startup founder (owner) or an platform admin can edit.
- **Auth**: `Bearer <token>` (Owner or Admin)
- **Request Body**: Partial startup fields.
- **Response**: `200 OK` (Updated startup object with recomputed `profile_completeness`)

#### `DELETE /api/v1/startups/:id`
Deletes a startup profile. Only the startup owner or admin can delete.
- **Auth**: `Bearer <token>` (Owner or Admin)
- **Response**: `200 OK`

---

### 2. Team Member Management

#### `GET /api/v1/startups/:id/team-members`
Lists all team members of a startup.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK` (Array of team members)

#### `POST /api/v1/startups/:id/team-members`
Adds a team member to the startup.
- **Auth**: `Bearer <token>` (Startup owner or admin)
- **Request Body**:
```json
{
  "name": "Jaspreet Kaur",
  "role_title": "Co-Founder & CTO",
  "email": "jaspreet@farmsense.example.com",
  "is_primary": true
}
```
- **Response**: `201 Created`

#### `PATCH /api/v1/startups/:id/team-members/:memberId`
Updates team member details.
- **Auth**: `Bearer <token>` (Startup owner or admin)
- **Response**: `200 OK`

#### `DELETE /api/v1/startups/:id/team-members/:memberId`
Removes a team member.
- **Auth**: `Bearer <token>` (Startup owner or admin)
- **Response**: `200 OK`

---

### 3. Profile Completeness Algorithm
`profile_completeness` (0 to 100) is dynamically calculated from 11 core startup fields:
1. `name`
2. `logo`
3. `tagline`
4. `sectors` (must be non-empty array)
5. `stage`
6. `problem`
7. `solution`
8. `target_market`
9. `business_model`
10. `funding_ask` (numeric value > 0)
11. `location`

Each populated field contributes `Math.round(100 / 11)` (~9%) with 100% when all 11 fields are filled.

---

### 4. Pitch Decks & Documents (Supabase Storage)

#### `POST /api/v1/startups/:id/documents`
Uploads a pitch deck or supporting document to the private Supabase Storage bucket `startup-documents`.
- **Auth**: `Bearer <token>` (Startup owner or admin)
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: PDF only, max 10MB.
  - `title`: Document title string.
  - `type`: `pitch_deck` (default), `financials`, or `other`.
  - `visibility`: `public`, `access_controlled` (default), or `private`.
- **Versioning**: Each new upload for the startup automatically computes and assigns the next incremented integer version (`version = max(versions) + 1`).
- **Response**: `201 Created`

#### `GET /api/v1/startups/:id/documents`
Lists documents for a startup that the caller is authorized to view.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `DELETE /api/v1/documents/:id`
Deletes document record and removes file from Supabase Storage bucket.
- **Auth**: `Bearer <token>` (Owner or Admin)
- **Response**: `200 OK`

---

### 5. Access Control & 60-Second Signed URLs

#### `POST /api/v1/documents/:id/access-requests`
Creates an access request to view an `access_controlled` pitch deck.
- **Auth**: `Bearer <token>` (Verified user)
- **Request Body**:
```json
{
  "notes": "Interested in reviewing your deck for Seed funding."
}
```
- **Notifications**: Automatically notifies the startup founder via the `notify()` service.
- **Response**: `201 Created`

#### `GET /api/v1/documents/:id/access-requests`
Lists all access requests for a document.
- **Auth**: `Bearer <token>` (Startup owner or admin)
- **Response**: `200 OK`

#### `POST /api/v1/document-access-requests/:id/approve`
Approves an access request.
- **Auth**: `Bearer <token>` (Startup owner or admin)
- **Request Body**: Optional `{ "notes": "Approved" }`
- **Notifications**: Automatically notifies the requesting user of approval.
- **Response**: `200 OK`

#### `POST /api/v1/document-access-requests/:id/decline`
Declines an access request.
- **Auth**: `Bearer <token>` (Startup owner or admin)
- **Request Body**: Optional `{ "notes": "Not seeking investor meetings at this stage." }`
- **Notifications**: Automatically notifies the requesting user of decline.
- **Response**: `200 OK`

#### `GET /api/v1/documents/:id/download`
Generates a time-limited signed URL valid for **60 seconds** only.
- **Auth**: `Bearer <token>`
- **Access Rule Matrix**:
  - **Owner & Admin**: Always allowed.
  - **`public`**: Any user with `verification_status: "verified"` is allowed. Unverified users receive `403 UNVERIFIED_ACCOUNT`.
  - **`access_controlled`**: Refused with `403 ACCESS_REQUIRED` unless an access request has been approved. Refused if pending or declined.
  - **`private`**: Refused with `403 ACCESS_DENIED` for anyone except owner or admin.
- **Response**: `200 OK`
```json
{
  "data": {
    "download_url": "https://fqbixskkrtlbvplchjjp.supabase.co/storage/v1/object/sign/startup-documents/...?token=...",
    "expires_in": 60,
    "version": 1
  }
}
```

---

## Endpoints (Iteration 5: Discovery, Search & Filters)

### 1. Startup Discovery & Browsing

#### `GET /api/v1/startups`
Browses and searches listed startups with filtering, sorting, and pagination.
- **Auth**: Optional. Accessible to both authenticated community members and unauthenticated public callers.
- **Listing & Safety Guarantees**:
  - Only returns **listed** startups:
    - Visibility is `public` or `access_controlled`. Private startups (`visibility = 'private'`) are NEVER listed in discovery.
    - Founder account must be verified / approved (`verification_status IN ('approved', 'verified')`). Unverified or pending founders' startups never appear.
    - Not hidden by platform moderation (`is_hidden = false`).
- **Query Parameters**:
  - `q`: Full-text search keyword across startup name, tagline, description, problem, solution, sectors, location, and business model. Sanitized against SQL injection.
  - `sector`: Sector filter. Supports single string, comma-delimited strings (`sector=AgriTech,Clean Energy`), or repeated params (`sector=AgriTech&sector=AI`).
  - `stage`: Startup maturity stage (`idea`, `validation`, `mvp`, `early_traction`, `growth`).
  - `location`: Case-insensitive substring match on startup location.
  - `funding_min`: Numeric lower bound for `funding_ask`.
  - `funding_max`: Numeric upper bound for `funding_ask`.
  - `business_model`: Case-insensitive substring match on `business_model`.
  - `sort`: Sorting order:
    - `newest` (default): Created date descending (`created_at DESC`).
    - `funding`: Funding ask descending (`funding_ask DESC`).
    - `relevance`: Text match ranking score descending (`score DESC`), falling back to `created_at DESC`.
  - `page`: 1-based page number (default: `1`).
  - `limit`: Number of items per page (default: `20`, max: `100`).
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "s0000000-0000-0000-0000-000000000001",
      "name": "FarmSense",
      "logo": "https://foundersden.network/logos/farmsense.png",
      "tagline": "Practical intelligence for every farmer.",
      "sectors": ["AgriTech", "Climate Tech"],
      "stage": "mvp",
      "funding_ask": 1500000,
      "currency": "INR",
      "location": "Ludhiana, Punjab, India",
      "visibility": "access_controlled",
      "has_access": false,
      "profile_completeness": 100,
      "created_at": "2026-10-24T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 48,
    "total_pages": 3
  }
}
```

---

### 2. Startup Detail (Public & Sensitive Views)

#### `GET /api/v1/startups/:id`
Retrieves startup detail view.
- **Auth**: Optional (`optionalAuthenticate`).
- **Access Rule Matrix**:
  - **Private Startups (`visibility = 'private'`)**: Returns `403 Forbidden` unless the caller is the startup founder (owner) or platform admin.
  - **Public Fields**: Name, logo, tagline, sectors, stage, funding_ask, currency, location, visibility, and profile_completeness are always returned.
  - **Sensitive Fields (`problem`, `solution`, `target_market`, `business_model`)**:
    - Returned if `visibility = 'public'`.
    - Returned if the caller is the startup owner or admin.
    - Returned if the caller has an **approved** document access request (`has_access = true`).
    - **Redacted (null)** for public unauthenticated visitors or unapproved callers on `access_controlled` startups.
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "s0000000-0000-0000-0000-000000000001",
    "name": "FarmSense",
    "tagline": "Practical intelligence for every farmer.",
    "sectors": ["AgriTech", "Climate Tech"],
    "stage": "mvp",
    "funding_ask": 1500000,
    "currency": "INR",
    "location": "Ludhiana, Punjab, India",
    "visibility": "access_controlled",
    "has_access": true,
    "problem": "Northern farmers lack real-time soil moisture and direct mandi price discovery.",
    "solution": "Affordable IoT sensor companion with multilingual WhatsApp price delivery.",
    "target_market": "Over 1M northern smallholders farming 5-20 acres.",
    "business_model": "Sensor lease + annual advisory subscription.",
    "profile_completeness": 100
  }
}
```

---

### 3. Discovery Filter Metadata

#### `GET /api/v1/meta/sectors`
Returns distinct startup sectors with active listed startup counts for filter controls.
- **Auth**: None (Public)
- **Response**: `200 OK`
```json
{
  "data": [
    { "sector": "AgriTech", "count": 18 },
    { "sector": "Climate Tech", "count": 12 },
    { "sector": "AI", "count": 9 },
    { "sector": "HealthTech", "count": 6 }
  ]
}
```

#### `GET /api/v1/meta/stages`
Returns distinct startup stages with active listed startup counts.
- **Auth**: None (Public)
- **Response**: `200 OK`
```json
{
  "data": [
    { "stage": "idea", "count": 5 },
    { "stage": "validation", "count": 11 },
    { "stage": "mvp", "count": 22 },
    { "stage": "early_traction", "count": 8 },
    { "stage": "growth", "count": 2 }
  ]
}
```

#### `GET /api/v1/meta/locations`
Returns distinct startup locations with active listed startup counts.
- **Auth**: None (Public)
- **Response**: `200 OK`
```json
{
  "data": [
    { "location": "Ludhiana, Punjab, India", "count": 14 },
    { "location": "Bengaluru, Karnataka, India", "count": 12 },
    { "location": "Chandigarh, India", "count": 8 }
  ]
}
```

---

## Endpoints (Iteration 6: Investor Preferences & Transparent Smart Matching)

### 1. Investor Preferences

#### `GET /api/v1/investors/preferences`
Retrieves the investment preferences and mandate for the authenticated investor.
- **Auth**: `Bearer <token>` (`investor` or `admin` role required)
- **Response**: `200 OK`
```json
{
  "data": {
    "firm_name": "Northstar Ventures",
    "sectors": ["AgriTech", "Climate Tech"],
    "stages": ["mvp", "early_traction"],
    "ticket_min": 1000000,
    "ticket_max": 5000000,
    "regions": ["Punjab", "India"],
    "business_models": ["B2B"],
    "thesis": "Early-stage agritech and climate hardware with proven field pilots."
  }
}
```

#### `PUT /api/v1/investors/preferences`
Updates the investment preferences. Validates constraints and invalidates cached scores in `match_scores` for this investor.
- **Auth**: `Bearer <token>` (`investor` or `admin` role required)
- **Validation**:
  - `sectors`: Non-empty array of strings.
  - `stages`: Non-empty array of valid stages (`idea`, `validation`, `mvp`, `early_traction`, `growth`).
  - `ticket_min`: Number >= 0.
  - `ticket_max`: Number >= `ticket_min`.
  - `regions`: Array of strings (optional).
  - `business_models`: Array of strings (optional).
  - `thesis`: Optional string.
  - `firm_name`: Optional string.
- **Response**: `200 OK`

---

### 2. Pure Matching Engine (`/backend/src/matching/score.ts`)

Pure mathematical engine with **zero database dependencies**.
- Configurable weights summing to 100:
  - **Industry (30%)**: Share of startup's sectors covered by investor (`intersection / startup_sectors`).
  - **Stage (25%)**: Exact match = 100, adjacent stage in progression = 50, otherwise = 0.
  - **Funding Ask (20%)**: 100 if ask is within `[ticket_min, ticket_max]`; below min = `100 * ask / ticket_min`; above max = `100 * ticket_max / ask`.
  - **Location (15%)**: Same city = 100, same state = 80, same country = 60, investor open to any region = 60, otherwise = 0.
  - **Business Model (10%)**: Share of overlap; neutral 50 if investor has no preference specified.
- Mandatory disclaimer included in all outputs:
  > *"The score measures profile compatibility, not the probability of funding."*
- Deterministic ordering: Sorted by `score DESC`, tie-broken by `id ASC`.

---

### 3. Smart Matching Endpoints

#### `GET /api/v1/matches/investors?startup_id=<uuid>`
Founder flow: Retrieves ranked verified investors compatible with the startup.
- **Auth**: `Bearer <token>` (`founder` or `admin` role required)
- **Query Parameters**:
  - `startup_id` (required): UUID of the startup. Caller must be the startup owner or admin.
  - `page`: 1-based page index (default: `1`).
  - `limit`: Page size (default: `20`, max: `100`).
- **Security**: Only verified investors are returned.
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "investor_id": "i0000000-0000-0000-0000-000000000001",
      "firm_name": "Northstar Ventures",
      "location": "Chandigarh, India",
      "sectors": ["AgriTech", "Climate Tech"],
      "stages": ["mvp", "early_traction"],
      "ticket_min": 1000000,
      "ticket_max": 5000000,
      "score": 97,
      "breakdown": {
        "industry": 100,
        "stage": 100,
        "funding": 100,
        "location": 80,
        "business_model": 100
      },
      "reasons": [
        "Matches 2 of 2 sectors (AgriTech, Climate Tech)",
        "Exact stage match for MVP",
        "Funding ask of ₹15 Lakh is within ticket range (₹10 Lakh - ₹50 Lakh)",
        "Same state match (Punjab)",
        "Overlaps business model (B2B)"
      ],
      "disclaimer": "The score measures profile compatibility, not the probability of funding."
    }
  ],
  "disclaimer": "The score measures profile compatibility, not the probability of funding.",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

#### `GET /api/v1/matches/startups`
Investor flow: Retrieves ranked listed startups compatible with the authenticated investor's preferences.
- **Auth**: `Bearer <token>` (`investor` or `admin` role required)
- **Query Parameters**:
  - `page`: 1-based page index (default: `1`).
  - `limit`: Page size (default: `20`, max: `100`).
- **Security & Visibility**:
  - Private startups (`visibility = 'private'`) and hidden startups (`is_hidden = true`) are excluded.
  - Only startups with approved/verified founders are matched.
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "startup_id": "s0000000-0000-0000-0000-000000000001",
      "name": "FarmSense",
      "tagline": "Practical intelligence for every farmer.",
      "sectors": ["AgriTech", "Climate Tech"],
      "stage": "mvp",
      "funding_ask": 1500000,
      "location": "Ludhiana, Punjab, India",
      "business_model": "B2B",
      "score": 97,
      "breakdown": {
        "industry": 100,
        "stage": 100,
        "funding": 100,
        "location": 80,
        "business_model": 100
      },
      "reasons": [
        "Matches 2 of 2 sectors (AgriTech, Climate Tech)",
        "Exact stage match for MVP",
        "Funding ask of ₹15 Lakh is within ticket range (₹10 Lakh - ₹50 Lakh)",
        "Same state match (Punjab)",
        "Overlaps business model (B2B)"
      ],
      "disclaimer": "The score measures profile compatibility, not the probability of funding."
    }
  ],
  "disclaimer": "The score measures profile compatibility, not the probability of funding.",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

## Iteration 7: Investor Engagement, Connections and Messaging

### 1. Watchlist & Private Notes

#### `POST /api/v1/watchlist/:startup_id`
Adds a startup to the authenticated investor's watchlist. Idempotent: returns 201 on initial add and 200/201 on subsequent requests.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Response**: `201 Created`
```json
{
  "data": {
    "id": "w-i0000000-0000-0000-0000-000000000001-s0000000-0000-0000-0000-000000000001",
    "investor_id": "i0000000-0000-0000-0000-000000000001",
    "startup_id": "s0000000-0000-0000-0000-000000000001",
    "created_at": "2026-10-27T02:00:00.000Z"
  },
  "message": "Startup added to watchlist"
}
```

#### `DELETE /api/v1/watchlist/:startup_id`
Removes a startup from the investor's watchlist.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Response**: `200 OK`

#### `GET /api/v1/watchlist`
Lists all startups in the investor's watchlist, populated with current pipeline status and the investor's confidential note.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Response**: `200 OK`

#### `GET /api/v1/startups/:id/notes`
Retrieves the investor's confidential note for a startup. Visible ONLY to the investor who created it.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Response**: `200 OK`

#### `PUT /api/v1/startups/:id/notes`
Upserts a private note for a startup.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Request Body**:
```json
{
  "note": "Pilot metrics in Ludhiana show 18% cost reduction for wheat farmers. Schedule meeting."
}
```
- **Response**: `200 OK`

#### `DELETE /api/v1/startups/:id/notes`
Deletes the private note.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Response**: `200 OK`

---

### 2. Deal Pipeline State Machine & History

#### `GET /api/v1/pipeline`
Returns all startups in the investor's pipeline grouped into 5 stages: `interested`, `meeting_requested`, `in_discussion`, `follow_up`, `passed`.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Response**: `200 OK`

#### `PUT /api/v1/pipeline/:startup_id`
Updates the pipeline status of a startup through a validated state machine. Invalid transitions are rejected with 400 `INVALID_TRANSITION`.
- **Allowed Transitions**:
  - `interested` → `meeting_requested`, `follow_up`, `passed`
  - `meeting_requested` → `in_discussion`, `follow_up`, `passed`
  - `in_discussion` → `follow_up`, `passed`, `meeting_requested`
  - `follow_up` → `meeting_requested`, `in_discussion`, `passed`
  - `passed` → `interested`, `follow_up`
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Request Body**:
```json
{
  "status": "meeting_requested",
  "notes": "Intro meeting invite sent"
}
```
- **Response**: `200 OK`

#### `GET /api/v1/pipeline/:startup_id/history`
Returns the full chronological audit history of status changes for this startup in the investor's pipeline.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Response**: `200 OK`

---

### 3. Pitch Meeting Requests & Clarification Messages

#### `POST /api/v1/pitch-requests`
Creates a pitch meeting request for a startup with a proposed date and introductory message. Automatically moves the startup into `meeting_requested` pipeline status. Duplicate pending requests return 409 `DUPLICATE_PITCH_REQUEST`.
- **Auth**: `Bearer <token>` (`investor` or `admin`)
- **Request Body**:
```json
{
  "startup_id": "s0000000-0000-0000-0000-000000000001",
  "proposed_date": "2026-11-05T10:00:00Z",
  "message": "We loved your deck and would like to schedule a 30-min intro pitch meeting."
}
```
- **Response**: `201 Created`

#### `GET /api/v1/pitch-requests`
Returns pitch meeting requests. For investors: outgoing requests. For founders: incoming requests for their registered startups.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `GET /api/v1/pitch-requests/:id`
Retrieves a single pitch request along with its typed clarification message thread.
- **Auth**: `Bearer <token>` (Participants only)
- **Response**: `200 OK`

#### `PATCH /api/v1/pitch-requests/:id/respond`
Allows the founder of the startup to respond: `accept`, `decline`, or propose another date (`date_proposed` with `counter_date` and `message`). Enforces strict founder ownership; unauthorized founders receive 403 `FORBIDDEN_RESOURCE`.
- **Auth**: `Bearer <token>` (Startup founder only)
- **Request Body**:
```json
{
  "action": "date_proposed",
  "counter_date": "2026-11-07T14:00:00Z",
  "message": "Available Friday afternoon instead."
}
```
- **Response**: `200 OK`

#### `POST /api/v1/pitch-requests/:id/messages`
Sends a typed message on the pitch request thread for due-diligence questions.
- **Auth**: `Bearer <token>` (Request participants only)
- **Request Body**:
```json
{
  "content": "Could you provide recent monthly sensor installation numbers?",
  "message_type": "info_request"
}
```
- **Response**: `201 Created`

---

### 4. Connections & Direct Messaging

#### `POST /api/v1/connections`
Sends a connection request to another verified user. Duplicate requests return 409.
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "recipient_id": "f0000000-0000-0000-0000-000000000002"
}
```
- **Response**: `201 Created`

#### `PATCH /api/v1/connections/:id`
Accepts or declines a connection request. Only the recipient can accept or decline.
- **Auth**: `Bearer <token>` (Recipient only)
- **Request Body**:
```json
{
  "action": "accept"
}
```
- **Response**: `200 OK`

#### `GET /api/v1/connections`
Lists user connections with partner profiles.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `GET /api/v1/conversations`
Lists all active 1-to-1 conversation threads with unread counts and last message snippet.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `GET /api/v1/conversations/:id/messages`
Fetches message history between the caller and the specified user.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `POST /api/v1/conversations/:id/messages`
Sends a direct message. **Security Rule**: Messaging is blocked between unconnected users with 403 `MESSAGING_NOT_ALLOWED` unless there is an approved connection or an accepted pitch meeting request.
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "content": "Thanks for accepting the meeting. Where should we send calendar invite?"
}
```
- **Response**: `201 Created`

#### `PATCH /api/v1/conversations/:id/read`
Marks all unread messages in the conversation as read.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

---

## 8. Mentorship, Incubation & Notifications (Iteration 8)

### 8.1 Mentors & Mentorship Requests

#### `GET /api/v1/mentors`
Lists verified mentors. Supports filtering by expertise area.
- **Auth**: Public or `Bearer <token>`
- **Query Parameters**:
  - `expertise`: String (e.g. `AgriTech`, `SaaS Growth`)
- **Response**: `200 OK`

#### `GET /api/v1/mentors/:id`
Retrieves mentor profile, operational background, and expertise areas.
- **Auth**: Public or `Bearer <token>`
- **Response**: `200 OK`

#### `POST /api/v1/mentorship-requests`
Founder sends a mentorship guidance request for a specific startup.
- **Auth**: `Bearer <token>` (Founder or Admin)
- **Request Body**:
```json
{
  "mentor_id": "m0000000-0000-0000-0000-000000000001",
  "startup_id": "s0000000-0000-0000-0000-000000000001",
  "topic": "Go-to-market advisory",
  "message": "Would love your guidance on our AgriTech sensor pilot in Punjab.",
  "goals": ["Field trial validation", "Pricing advice"]
}
```
- **Notifications**: Automatically notifies the target mentor via `notify()`.
- **Response**: `201 Created`

#### `GET /api/v1/mentorship-requests` & `GET /api/v1/me/mentorship-requests`
Lists incoming or outgoing mentorship requests for the authenticated user.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `PATCH /api/v1/mentorship-requests/:id/respond`
Target mentor accepts or declines the mentorship request.
- **Auth**: `Bearer <token>` (Target Mentor only; other users receive `403 FORBIDDEN_RESOURCE`)
- **Request Body**:
```json
{
  "status": "accepted",
  "response_note": "Glad to connect! Let's arrange an introductory call."
}
```
- **Notifications**: Dispatches notification to the requesting founder.
- **Response**: `200 OK`

#### `POST /api/v1/startups/:id/feedback`
Mentors submit structured advisory feedback and ratings for a startup.
- **Auth**: `Bearer <token>` (Mentor or Admin)
- **Request Body**:
```json
{
  "rating": 5,
  "feedback": "Strong unit economics and local cooperative trust in Punjab.",
  "strengths": ["Clear value prop", "Low CAC"],
  "areas_for_improvement": ["Patent defense needed"]
}
```
- **Validation**: Rating must be an integer between 1 and 5 (out-of-range returns 400/422).
- **Notifications**: Dispatches `mentor_feedback` notification to the startup owner.
- **Response**: `201 Created`

#### `GET /api/v1/startups/:id/feedback`
Lists all feedback and ratings left by mentors for a startup.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

---

### 8.2 Incubator Programs

#### `POST /api/v1/programs`
Creates an incubator or acceleration program cohort.
- **Auth**: `Bearer <token>` (Incubator or Admin only)
- **Request Body**:
```json
{
  "title": "DeepTech Acceleration Cohort 2027",
  "description": "6-month intensive acceleration for hardware and AI prototypes.",
  "eligibility": "Must have working MVP registered in India.",
  "benefits": "₹25 Lakh funding, fab lab access, demo day.",
  "sectors": ["AI", "Hardware", "DeepTech"],
  "deadline": "2027-03-31T23:59:59Z"
}
```
- **Response**: `201 Created`

#### `GET /api/v1/programs`
Public listing of active programs with filter support.
- **Query Parameters**: `sector`, `stage`, `activeOnly`
- **Response**: `200 OK`

#### `GET /api/v1/programs/:id`
Retrieves program details.
- **Response**: `200 OK`

#### `PATCH /api/v1/programs/:id`
Updates program benefits, deadline, or description.
- **Auth**: `Bearer <token>` (Owning incubator only; others receive `403 FORBIDDEN_RESOURCE`)
- **Response**: `200 OK`

#### `DELETE /api/v1/programs/:id`
Deletes an incubation program.
- **Auth**: `Bearer <token>` (Owning incubator only)
- **Response**: `200 OK`

---

### 8.3 Applications & Funnel State Machine

#### `POST /api/v1/programs/:id/apply`
Founders submit their startup to an incubator program.
- **Auth**: `Bearer <token>` (Startup Founder)
- **Request Body**:
```json
{
  "startup_id": "s0000000-0000-0000-0000-000000000001",
  "pitch_summary": "Practical crop intelligence for 200+ northern farmers."
}
```
- **Enforcements**:
  - **Deadline Check**: If current time is past `program.deadline`, returns **`422 DEADLINE_PASSED`**.
  - **Duplicate Check**: Only 1 application allowed per startup per program. Duplicate returns **`409 DUPLICATE_APPLICATION`**.
- **Notifications**: Dispatches `application_submitted` notification to the incubator.
- **Response**: `201 Created`

#### `GET /api/v1/me/applications`
Founders list all their program applications, statuses, and decision notes.
- **Auth**: `Bearer <token>` (Founder)
- **Response**: `200 OK`

#### `GET /api/v1/applications` & `GET /api/v1/programs/:id/applications`
Incubators list applications received for review.
- **Auth**: `Bearer <token>` (Incubator or Admin)
- **Response**: `200 OK`

#### `PATCH /api/v1/applications/:id/status`
Advances an application through the state funnel.
- **Auth**: `Bearer <token>` (Owning Incubator only; others receive `403 FORBIDDEN_RESOURCE`)
- **State Machine Transitions**:
  - `submitted` -> `under_review`, `rejected`
  - `under_review` -> `shortlisted`, `rejected`
  - `shortlisted` -> `accepted`, `rejected`
  - `rejected` -> `under_review`
  - *Invalid jump returns **`400 INVALID_STATUS_TRANSITION`**.*
- **Request Body**:
```json
{
  "status": "shortlisted",
  "decision_notes": "Shortlisted for interview batch 1."
}
```
- **Notifications**: Dispatches `application_status_updated` notification to the founder.
- **Response**: `200 OK`

---

### 8.4 Notifications

#### `GET /api/v1/notifications`
Fetches chronological notification feed for the authenticated user.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

#### `GET /api/v1/notifications/unread-count`
Returns unread notification badge count.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": {
    "count": 3,
    "unread_count": 3
  }
}
```

#### `PATCH /api/v1/notifications/:id/read`
Marks an individual notification as read.
- **Auth**: `Bearer <token>` (Recipient only; others receive `403 FORBIDDEN_RESOURCE`)
- **Response**: `200 OK`

#### `POST /api/v1/notifications/read-all`
Marks all unread notifications for the user as read.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`
