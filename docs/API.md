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

