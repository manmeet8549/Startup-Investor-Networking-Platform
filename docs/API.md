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
