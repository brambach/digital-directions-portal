# Digital Directions Portal

Custom-built HiBob implementation and integration management portal for Digital Directions consulting. Built with Next.js 15, TypeScript, and modern tools.

**Note:** This is a purpose-built portal for Digital Directions - not a white-label solution.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + Shadcn UI
- **Authentication:** Clerk (role-based: admin/client)
- **Database:** Vercel Postgres + Drizzle ORM
- **File Storage:** UploadThing
- **Email:** Resend (optional)
- **Notifications:** Slack integration (optional)
- **Deployment:** Vercel

## Features

### Core Features
- **Client Management** - Track client companies with status (active/inactive/archived)
- **Project Management** - HiBob integration projects with phase tracking
- **File Sharing** - Secure file uploads per project (32MB limit)
- **Messaging** - Project-based messaging between DD and clients
- **Support Tickets** - Full ticket system with assignment, comments, time tracking

### Integration Monitoring
- **Status Page Monitoring** - HiBob, KeyPay, Workato, ADP, NetSuite
- **Health Checks** - Automated checks every 5 minutes via Vercel Cron
- **Alerting** - Email + in-app notifications when integrations go down
- **Metrics History** - Track uptime and response times

### Project Phases
- **Phase Templates** - Reusable phase definitions
- **Phase Tracking** - Visual progress stepper
- **Status Updates** - Pending, in-progress, completed, skipped

### Support Hours
- **Monthly Allocations** - Track client retainer hours
- **Time Tracking** - Log time per ticket
- **Usage Reports** - Visual progress indicators

### Notifications
- **In-App Notifications** - Bell icon with unread count
- **Email Notifications** - Ticket updates, integration alerts
- **Slack Integration** - Real-time team notifications

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel account (for Postgres + deployment)
- Clerk account (authentication)
- UploadThing account (file storage)

### 1. Clone and Install

```bash
git clone <repo-url>
cd digital-directions-portal
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SECRET` - For user sync webhook
- `POSTGRES_URL` - Vercel Postgres connection string
- `UPLOADTHING_TOKEN` - UploadThing API token

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Seed demo data (optional)
npm run db:seed
```

### 4. Configure Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Create endpoint: `https://your-domain.vercel.app/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy webhook secret to `CLERK_WEBHOOK_SECRET`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Development Commands

```bash
# Development
npm run dev              # Start with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:push          # Push schema changes
npm run db:generate      # Generate migrations
npm run db:migrate       # Generate + push
npm run db:seed          # Seed demo data
npm run db:studio        # Open Drizzle Studio GUI
npm run db:reset         # Drop, recreate, reseed (dev only)

# User Management
npm run make-admin <email>  # Grant admin role
npm run cleanup-users       # Remove orphaned users
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Sign-in/sign-up pages
│   ├── (dashboard)/         # Protected dashboard
│   │   └── dashboard/
│   │       ├── admin/       # Admin pages
│   │       └── client/      # Client pages
│   └── api/                 # API routes
│       ├── clients/         # Client CRUD
│       ├── projects/        # Project management
│       ├── tickets/         # Ticket system
│       ├── integrations/    # Integration monitoring
│       ├── notifications/   # In-app notifications
│       ├── cron/            # Scheduled jobs
│       └── webhooks/        # External webhooks
├── components/
│   ├── ui/                  # Shadcn components
│   └── layout/              # Layout components
├── lib/
│   ├── db/
│   │   ├── schema.ts        # Database schema (18 tables)
│   │   └── seed.ts          # Demo data
│   ├── integrations/        # Health checkers
│   ├── auth.ts              # Auth helpers
│   └── crypto.ts            # Credential encryption
└── middleware.ts            # Route protection
```

## Database Schema

18 tables organized by feature:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (role, agency/client link) |
| `agencies` | Digital Directions agency |
| `clients` | Client companies |
| `projects` | Integration projects |
| `files` | Project files |
| `messages` | Project messaging |
| `tickets` | Support tickets |
| `ticket_comments` | Ticket conversation |
| `ticket_time_entries` | Time tracking |
| `invites` | User invitations |
| `client_activity` | Engagement metrics |
| `support_hour_logs` | Historical support hours |
| `integration_monitors` | Health check config |
| `integration_metrics` | Health check history |
| `integration_alerts` | Alert history |
| `user_notifications` | In-app notifications |
| `phase_templates` | Reusable phases |
| `template_phases` | Phases in templates |
| `project_phases` | Project phase tracking |

## Production Deployment

### Vercel Deployment

1. Connect repository to Vercel
2. Add all environment variables
3. Deploy

### Required Production Variables

In addition to development variables:

```env
# Security (REQUIRED in production)
CRON_SECRET=random-secret-for-cron-jobs
CREDENTIALS_ENCRYPTION_KEY=64-char-hex-key
```

### Vercel Cron Setup

The `vercel.json` configures automatic health checks:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-integrations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Security Notes

- **Authentication**: All routes protected by Clerk middleware
- **Authorization**: Role-based access (admin vs client)
- **Encryption**: Workato credentials encrypted with AES-256-GCM
- **Soft Deletes**: All records use `deletedAt` for audit trail
- **Webhook Security**: Clerk webhooks verified with SVIX

## Documentation

For detailed architecture and patterns, see `CLAUDE.md`.

## License

Private project for Digital Directions consulting.
