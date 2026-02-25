# Digital Directions Portal

Internal client management portal for Digital Directions — an Australian-based HiBob integration consultancy. Purpose-built and single-tenant; not a white-label product.

## What it does

- **Project lifecycle tracking** — 9-stage implementation pipeline (Discovery → Go-Live) with client-facing progress visibility
- **Data mapping** — Admin configures HiBob↔payroll value mappings; clients complete them via an interactive connector UI
- **File sharing** — Upload/download project documents between DD and clients
- **Messaging** — Project-scoped messaging thread between DD team and client users
- **Integration health** — Monitor HiBob, KeyPay, Workato, and other service status pages
- **Support** — Ticket submission routes to Freshdesk via email; clients submit from the portal
- **Diji AI chatbot** — Claude-powered assistant for self-serve client support before ticket escalation

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Shadcn UI |
| Auth | Clerk |
| Database | Vercel Postgres (Neon) + Drizzle ORM |
| File storage | UploadThing |
| Email | Resend |
| Slack | Slack Bot API |
| Support | Freshdesk |
| AI | Anthropic Claude (Haiku) |
| Deployment | Vercel |

## Getting started

### Prerequisites

- Node.js 20+
- A Clerk account
- A Neon/Vercel Postgres database
- An UploadThing account

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in values in .env.local

# Push database schema
npm run db:push

# Seed with initial data (Digital Directions agency + demo clients)
npm run db:seed

# Grant yourself admin access
npm run make-admin your@email.com

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Development commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:push      # Push schema changes (no migration file)
npm run db:generate  # Generate migration from schema diff
npm run db:migrate   # Generate + push
npm run db:seed      # Seed database
npm run db:studio    # Open Drizzle Studio at localhost:4983
npm run db:reset     # Drop all tables, recreate, reseed (dev only)

# User management
npm run make-admin <email>   # Grant admin role
npm run cleanup-users        # Remove DB users not in Clerk
```

## Environment variables

See `.env.example` for the full list. Required variables:

```env
# Clerk (auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=

# File uploads
UPLOADTHING_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional integrations (portal works without these):

```env
RESEND_API_KEY=           # Email notifications
EMAIL_FROM=               # Sender address
SLACK_BOT_TOKEN=          # Slack notifications
SLACK_CHANNEL_ID=         # Slack channel
FRESHDESK_DOMAIN=         # Freshdesk subdomain (e.g. yourcompany-help)
FRESHDESK_API_KEY=        # Freshdesk API key
ANTHROPIC_API_KEY=        # Diji AI chatbot
CRON_SECRET=              # Secure the integration health cron endpoint
CREDENTIALS_ENCRYPTION_KEY=  # 64-char hex — encrypt stored Workato credentials
```

## Architecture

### Auth & roles

Two roles: `admin` (DD staff) and `client` (client company users). Clerk is the source of truth for profile data; the database stores `clerkId`, `role`, and `clientId`/`agencyId`.

Portal is invite-only — no public signup. Admins invite clients via the portal; invites expire after 7 days.

### Database

Single-tenant: one `agencies` record (Digital Directions), multiple `clients`, multiple `users` per client. All tables use soft deletes (`deletedAt` timestamp). Only clients support permanent deletion.

### Route structure

```
/dashboard/admin/*    # DD staff only
/dashboard/client/*   # Client users only
/invite/[token]       # Accept invite (public)
```

### Integration monitoring

Monitors run as a Vercel Cron job every 5 minutes (`/api/cron/check-integrations`), checking status pages for HiBob, KeyPay, Workato, ADP, and NetSuite. Alerts sent via email + in-app notifications on status changes.

## Deployment

Deploy to Vercel. Set all environment variables in the Vercel project settings.

The cron job (`vercel.json`) runs automatically on Vercel's infrastructure. Set `CRON_SECRET` to secure the endpoint.

## Project docs

Detailed architecture, patterns, and build notes live in [`CLAUDE.md`](./CLAUDE.md).
