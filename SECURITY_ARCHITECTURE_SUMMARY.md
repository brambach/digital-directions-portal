# Digital Directions Portal - Security Architecture Summary
**Prepared for ISO 27001 Compliance Review**
**Date:** January 2026

---

## Executive Summary

The Digital Directions Portal is a single-tenant Next.js application built with security-first architecture. Authentication is delegated to Clerk (SOC 2 Type II compliant), data is stored in Vercel Postgres with TLS encryption, and files are managed through UploadThing. The application implements role-based access control, credential encryption, and webhook signature verification.

**Overall Assessment:** Strong technical controls with gaps in audit logging and rate limiting.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE (HTTPS/TLS)                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE                                │   │
│  │  • Route protection (public vs protected)                    │   │
│  │  • Role-based access control (admin/client)                  │   │
│  │  • Session validation via Clerk                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│      CLERK       │    │  VERCEL POSTGRES │    │   UPLOADTHING    │
│  (Auth Provider) │    │   (Data Store)   │    │  (File Storage)  │
│                  │    │                  │    │                  │
│ • User accounts  │    │ • Clients        │    │ • Project files  │
│ • Session mgmt   │    │ • Projects       │    │ • Agency logos   │
│ • Profile data   │    │ • Tickets        │    │                  │
│ • MFA support    │    │ • Messages       │    │ 8MB max, images  │
│                  │    │ • Integrations   │    │ only for logos   │
│ SOC 2 Type II    │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. Authentication & Access Control

### Authentication Flow
| Step | Component | Security Control |
|------|-----------|------------------|
| 1 | User login | Clerk handles authentication (supports MFA) |
| 2 | Session created | Secure HTTP-only cookies, 24h expiration |
| 3 | Request made | Middleware validates session token |
| 4 | Role checked | Database stores authoritative role |
| 5 | Route access | RBAC enforces admin vs client separation |

### Role-Based Access Control
```
ADMIN ROLE (Digital Directions staff)
├── /dashboard/admin/*
├── Create/edit/delete clients
├── Create/edit projects
├── Manage support tickets
├── Configure integrations
└── Invite users

CLIENT ROLE (Client company users)
├── /dashboard/client/*
├── View own projects (read-only)
├── Submit support tickets
├── Send messages
└── Download files
```

### Access Control Implementation
- **Middleware** (`src/middleware.ts`): Validates all requests, enforces route protection
- **API Routes**: Each route checks `userId` from Clerk + `role` from database
- **Database**: Users linked to `clientId` - can only access own client's data

### Invite-Only Model
- No public signup - all users must be invited by admin
- Invite tokens: 256-bit cryptographically random (32 bytes)
- 7-day expiration with single-use enforcement
- Role and client association set at invite time

---

## 3. Data Protection

### Data Storage Locations

| Data Type | Storage | Encryption | Access Control |
|-----------|---------|------------|----------------|
| User credentials | Clerk | Clerk-managed | N/A (delegated) |
| User profiles (name, email) | Clerk | Clerk-managed | Via Clerk API |
| User roles & associations | Vercel Postgres | TLS in transit | Database queries |
| Client/project data | Vercel Postgres | TLS in transit | Role-based |
| Workato API credentials | Vercel Postgres | AES-256-GCM | Admin only |
| Files | UploadThing | UploadThing-managed | Project-based |

### Encryption Standards
- **In Transit**: TLS 1.2+ (Vercel enforces HTTPS)
- **At Rest (Credentials)**: AES-256-GCM with authenticated encryption
- **At Rest (Database)**: Vercel Postgres default encryption

### Credential Encryption Details
```
Algorithm: AES-256-GCM
Key Size: 256 bits (32 bytes)
IV: 16 bytes random per encryption
Auth Tag: 16 bytes (prevents tampering)
Format: iv:authTag:encryptedData (base64)
```

### Data Minimization
- Database stores only: `clerkId`, `role`, `agencyId/clientId`
- Profile data (name, email, avatar) fetched from Clerk on-demand
- No password storage (Clerk handles)
- No PII duplication between systems

### Soft Deletes
- All records use `deletedAt` timestamp (preserves audit trail)
- Queries filter `WHERE deletedAt IS NULL`
- Only clients support permanent deletion (with cascade)

---

## 4. Third-Party Services

| Service | Purpose | Compliance | Data Shared |
|---------|---------|------------|-------------|
| **Clerk** | Authentication | SOC 2 Type II | User accounts, sessions |
| **Vercel** | Hosting & Database | SOC 2 Type II | All application data |
| **UploadThing** | File storage | SOC 2 | Uploaded files |
| **Resend** | Email delivery | SOC 2 | Email addresses, content |
| **Slack** | Notifications | SOC 2 | Ticket/message summaries |

### Webhook Security
- **Clerk Webhooks**: Svix signature verification (HMAC-SHA256)
- **Cron Endpoints**: Bearer token validation (`CRON_SECRET`)

---

## 5. API Security

### Protection Layers
1. **HTTPS Only**: Vercel enforces TLS, redirects HTTP
2. **Authentication**: All protected routes require valid Clerk session
3. **Authorization**: Role check on every API call
4. **Input Validation**: Required field checks, type validation
5. **Parameterized Queries**: Drizzle ORM prevents SQL injection

### Public Endpoints (Intentionally Exposed)
| Endpoint | Protection |
|----------|------------|
| `/api/webhooks/clerk` | Svix signature verification |
| `/api/invites/validate` | Token validation only |
| `/api/invites/accept` | Token validation + Clerk session |
| `/api/cron/*` | Bearer token (`CRON_SECRET`) |

### Error Handling
- Generic 500 errors returned (no stack traces)
- Specific errors only for validation (400) and auth (401/403)
- Full errors logged server-side only

---

## 6. File Upload Security

### Controls
- **Authentication**: Required for all uploads
- **Authorization**: Admin-only for agency logos
- **File Type**: Restricted to images for logos
- **Size Limit**: 8MB maximum
- **Processing**: UploadThing handles virus scanning

### Access Pattern
- Files stored in UploadThing (not local)
- Database stores URL reference only
- Access controlled at project level
- No direct file system access

---

## 7. Audit & Monitoring

### Current Logging
| Event | Logged | Location |
|-------|--------|----------|
| User login | Timestamp | `clientActivity.lastLogin` |
| Message sent | Timestamp | `clientActivity.lastMessageSent` |
| File downloaded | Timestamp | `clientActivity.lastFileDownloaded` |
| Ticket created | Full details | Slack notification |
| Ticket assigned | Full details | Slack + in-app notification |
| Integration alert | Full details | Email + in-app notification |
| API errors | Full error | Vercel Function Logs |

### In-App Notifications
- Real-time bell icon with unread count
- Types: integration alerts, ticket updates, messages, file uploads
- 30-second auto-refresh

---

## 8. Environment & Secrets

### Required Secrets (Production)
```
CLERK_SECRET_KEY          # Clerk API authentication
CLERK_WEBHOOK_SECRET      # Webhook signature verification
POSTGRES_URL              # Database connection
UPLOADTHING_TOKEN         # File upload service
CRON_SECRET               # Cron job authentication
CREDENTIALS_ENCRYPTION_KEY # AES-256 key for credentials
```

### Optional Integrations
```
RESEND_API_KEY            # Email notifications
SLACK_BOT_TOKEN           # Slack notifications
SLACK_CHANNEL_ID          # Slack channel target
```

### Secret Management
- Stored in Vercel environment variables
- Not committed to repository
- Separate values for dev/staging/production

---

## 9. Known Gaps & Recommendations

### High Priority

| Gap | Risk | Recommendation |
|-----|------|----------------|
| No rate limiting | Brute force attacks | Add `@upstash/ratelimit` middleware |
| Limited audit logging | Compliance gap | Create comprehensive audit log table |
| Invite tokens unhashed | Database breach exposure | Hash with bcrypt before storage |

### Medium Priority

| Gap | Risk | Recommendation |
|-----|------|----------------|
| No file access logging | Can't audit downloads | Log file access to `clientActivity` |
| User enumeration possible | Information disclosure | Standardize error messages |
| No input schema validation | Injection risk | Add Zod validation on API routes |
| No key rotation policy | Long-term key exposure | Document rotation schedule |

### Low Priority

| Gap | Risk | Recommendation |
|-----|------|----------------|
| Slack workspace not verified | Misconfiguration | Verify workspace ID on setup |
| No SIEM integration | Limited visibility | Export logs to third-party SIEM |

---

## 10. ISO 27001 Control Mapping

### Covered Controls
- **A.5 Access Control**: Middleware RBAC, Clerk authentication
- **A.5.4 Password Management**: Delegated to Clerk (MFA supported)
- **A.7.1 Cryptographic Controls**: AES-256-GCM for credentials
- **A.8.3 Network Security**: HTTPS/TLS enforced
- **A.10.1 Information Protection**: Soft deletes, encryption

### Partial Coverage
- **A.5.3 Access Rights Management**: No approval workflow for role changes
- **A.7.2 Key Management**: No documented rotation policy
- **A.11.1 Audit Logging**: Limited to activity timestamps

### Gaps Requiring Attention
- **A.6.1 Security Roles**: No formal ISMS roles defined
- **A.6.2 Security Awareness**: No training program
- **A.9.1 Incident Reporting**: No documented process
- **A.9.2 Vulnerability Management**: No patch policy
- **A.11.2 Monitoring**: No SIEM integration

---

## 11. Production Readiness Checklist

### Must Complete
- [ ] Set `CRON_SECRET` environment variable
- [ ] Set `CREDENTIALS_ENCRYPTION_KEY` (64 hex chars)
- [ ] Verify Clerk webhook secret is configured
- [ ] Configure email (Resend) or disable notifications
- [ ] Configure Slack or disable notifications
- [ ] Review Vercel Function Logs retention

### Recommended
- [ ] Implement rate limiting on API routes
- [ ] Add comprehensive audit logging
- [ ] Hash invite tokens
- [ ] Add Zod validation schemas
- [ ] Document incident response process
- [ ] Set up secret rotation schedule

---

## 12. Key Files Reference

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Route protection, RBAC enforcement |
| `src/lib/auth.ts` | Auth helpers (getCurrentUser, requireAdmin) |
| `src/lib/crypto.ts` | AES-256-GCM encryption for credentials |
| `src/lib/db/schema.ts` | Database schema with soft deletes |
| `src/app/api/webhooks/clerk/route.ts` | Clerk webhook with signature verification |
| `src/app/api/uploadthing/core.ts` | File upload with auth checks |
| `src/app/api/cron/check-integrations/route.ts` | Cron with bearer token auth |

---

## Summary

The Digital Directions Portal implements strong technical security controls appropriate for a client-facing B2B application. The architecture follows security best practices including:

- **Defense in depth** with multiple authentication/authorization layers
- **Least privilege** with separate admin/client roles
- **Data minimization** by delegating auth to Clerk
- **Encryption** for sensitive credentials

Primary areas for improvement before production:
1. Rate limiting on API endpoints
2. Comprehensive audit logging for compliance
3. Hashing invite tokens
4. Documenting operational security procedures

The application is well-positioned for ISO 27001 compliance with additional work on organizational controls (policies, procedures, training) and enhanced technical logging.
