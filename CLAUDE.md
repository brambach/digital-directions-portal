# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital Directions Portal is a custom-built HiBob implementation management portal for Digital Directions consulting company. This is **not a white-label solution** - it's purpose-built and single-tenant for Digital Directions. All branding and customization happens at the code level.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Clerk auth, Vercel Postgres, Drizzle ORM, UploadThing

**Brand Colors:** Purple (#8B5CF6) is the primary brand color. All accent colors, buttons, links, and interactive elements use purple, not blue.

## Development Commands

```bash
# Development
npm run dev                 # Start dev server with Turbopack
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint

# Database
npm run db:push            # Push schema to database (no migrations)
npm run db:generate        # Generate migrations from schema
npm run db:migrate         # Generate + push (full migration)
npm run db:seed            # Seed database with Digital Directions data
npm run db:studio          # Open Drizzle Studio GUI (localhost:4983)
npm run db:reset           # Drop all tables, recreate, and reseed (dev only)

# User Management
npm run make-admin <email> # Grant admin role to user by email
```

## Architecture Overview

### Authentication & Authorization

**Clerk Integration:**
- Clerk is the **source of truth** for user profile data (email, name, avatar)
- Database only stores: `clerkId`, `role`, `agencyId`/`clientId`
- User metadata synced via webhook at `/api/webhooks/clerk`
- Role stored in Clerk's public metadata AND database (database is source of truth for role)

**Role-Based Access:**
- Two roles: `admin` (DD staff) and `client` (client company users)
- Middleware (`src/middleware.ts`) enforces route protection:
  - `/dashboard/admin/*` → admins only
  - `/dashboard/client/*` → clients only
  - Auto-redirects based on role
- Auth helpers in `src/lib/auth.ts`:
  - `getCurrentUser()` - Get DB user record
  - `requireAuth()` - Require any authenticated user
  - `requireAdmin()` - Require admin role

### Database Architecture

**Single-Tenant Design:**
- One `agencies` record (Digital Directions)
- Multiple `clients` (client companies like "Meridian Healthcare")
- Multiple `users` per client (multi-user support)
- Projects belong to clients
- Files and messages belong to projects

**Key Tables:**
- `users` - Minimal (clerkId, role, agencyId/clientId only)
- `agencies` - Digital Directions record (name, logo, primaryColor)
- `clients` - Client companies (status: active/inactive/archived)
- `projects` - HiBob integration projects (5 statuses)
- `files` - File metadata (actual files in UploadThing)
- `messages` - Project messaging between DD and clients
- `tickets` - Support tickets with Linear/Slack integration
- `invites` - Email invitations for new users (7-day expiry)
- `clientActivity` - Engagement tracking

**Soft Deletes:**
All tables have `deletedAt` timestamp. Use `isNull(deletedAt)` in queries. Only clients can be **permanently** deleted (with confirmation dialog).

**Cascade Deletes:**
Deleting a client cascades to: projects → files, messages, tickets

### Multi-User per Client

Clients can have multiple portal users (e.g., HR Director + Payroll Manager):
- Users link to `clientId` in database
- All users from same client see same projects/files
- Invite additional users via "Invite User" button on client detail page
- User count shown on client cards

### Route Structure

```
/                           # Public homepage
/sign-in, /sign-up          # Clerk auth pages
/invite/[token]             # Accept invite (creates account + assigns role/client)

/dashboard                  # Auto-redirects to /admin or /client based on role

/dashboard/admin/*          # Admin pages (DD staff only)
  /admin                    # Overview dashboard
  /admin/clients            # Client list with user counts
  /admin/clients/[id]       # Client detail (projects, portal users, activity)
  /admin/projects           # All projects across clients
  /admin/projects/[id]      # Project detail (files, messages)
  /admin/tickets            # Support ticket queue
  /admin/tickets/[id]       # Ticket detail with comments

/dashboard/client/*         # Client pages (client users only)
  /client                   # Client overview
  /client/projects          # Projects for this client
  /client/projects/[id]     # Project detail
  /client/tickets           # Tickets submitted by this client
  /client/tickets/[id]      # Ticket detail
```

### API Routes

All API routes require authentication. Most require specific roles.

**Client Management:**
- `POST /api/clients` - Create client (admin only, auto-associates with DD agency)
- `PATCH /api/clients/[id]/status` - Update status: active/inactive/archived
- `DELETE /api/clients/[id]` - Permanent delete with cascade

**Invites:**
- `POST /api/invites` - Create invite (admin only, sends email via Resend)
- `POST /api/invites/validate` - Validate token (public)
- `POST /api/invites/accept` - Accept invite after Clerk signup (public)

**Projects, Files, Messages, Tickets:**
Standard CRUD with role-based permissions. Clients can only access their own data.

### Invite System

Invite-only portal - no public signup:
- Admins invite team members → role="admin"
- Admins invite clients → role="client" + linked to clientId
- Invites sent via email (Resend) with 7-day expiry
- Tokens are cryptographically secure (32 bytes)
- After signup, role auto-synced to Clerk metadata
- `/sign-up` shows "invitation only" page if accessed directly

### Optional Integrations

**Email (Resend):**
- Invite emails
- Ticket notifications
- Set `RESEND_API_KEY` and `EMAIL_FROM`

**Slack:**
- Real-time notifications for tickets, messages, file uploads
- Set `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`

**Linear:**
- Sync tickets to Linear for internal tracking
- Set `LINEAR_API_KEY` and `LINEAR_TEAM_ID`

All integrations are optional - portal works without them.

## Key Patterns & Conventions

### Querying with Soft Deletes

Always filter out soft-deleted records:

```typescript
import { isNull } from "drizzle-orm";

const activeClients = await db
  .select()
  .from(clients)
  .where(isNull(clients.deletedAt));
```

### Getting User Data

```typescript
import { getCurrentUser } from "@/lib/auth";

// In API routes
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// In server components
const user = await requireAdmin(); // throws if not admin
const user = await requireAuth();  // throws if not authenticated
```

### Multi-User Queries

When a client has multiple users, query by `clientId`:

```typescript
const clientUsers = await db
  .select()
  .from(users)
  .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));
```

### Creating New Users

New users are created via invite system only. When invite is accepted:
1. User signs up with Clerk
2. `/api/invites/accept` creates DB user record
3. Role synced to Clerk public metadata
4. User linked to client (if client invite)

### Agency Association

All admins and clients belong to the Digital Directions agency:
- When creating clients, API auto-finds DD agency if user.agencyId is null
- Single-tenant architecture - only one agency record should exist

## Branding & Styling

**Colors:**
- Primary: Purple (#8B5CF6) - used for all buttons, links, accents
- Status badges: Green (active), Gray (inactive), Red (archived/overdue)
- Ticket priorities: Gray (low), Blue (medium), Orange (high), Red (urgent)

**CSS Variables:**
Theme colors defined in `src/app/globals.css` using HSL values. Primary and accent set to purple.

**Shadcn UI:**
Components in `src/components/ui/` use CSS variables for theming. Don't hardcode colors in Shadcn components.

## Common Pitfalls

1. **Don't store user profile data in DB** - Email, name, avatar come from Clerk. Use Clerk's `clerkClient.users.getUser(clerkId)` or the user object from `useUser()` hook.

2. **Always check deletedAt** - Forgetting `isNull(deletedAt)` will show deleted records.

3. **Role is in Clerk metadata AND database** - Database is source of truth. Middleware reads from Clerk for performance. After updating role in DB, sync to Clerk metadata.

4. **Agency linking** - Don't assume user.agencyId exists. APIs should auto-find Digital Directions agency if null.

5. **Multi-user clients** - Don't link users one-to-one with clients. Multiple users can share the same clientId.

6. **Permanent vs soft delete** - Only clients support permanent delete. Everything else uses soft delete.

## File Locations Reference

- **Schema:** `src/lib/db/schema.ts`
- **Seed data:** `src/lib/db/seed.ts`
- **Auth helpers:** `src/lib/auth.ts`
- **Middleware:** `src/middleware.ts`
- **Types:** `src/lib/types.ts`
- **UI components:** `src/components/ui/`
- **Dialogs/Forms:** `src/components/*.tsx`
- **Admin pages:** `src/app/(dashboard)/dashboard/admin/`
- **Client pages:** `src/app/(dashboard)/dashboard/client/`
- **API routes:** `src/app/api/`

## Environment Variables

Required for development:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database
POSTGRES_URL=postgresql://xxx
POSTGRES_URL_NON_POOLING=postgresql://xxx

# File Upload
UPLOADTHING_SECRET=sk_live_xxx
UPLOADTHING_APP_ID=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Optional integrations:
```env
RESEND_API_KEY=re_xxx
EMAIL_FROM=Digital Directions <notifications@yourdomain.com>
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_CHANNEL_ID=C0XXX
LINEAR_API_KEY=lin_api_xxx
LINEAR_TEAM_ID=xxx
```
