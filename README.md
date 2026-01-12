# Digital Directions Portal

Custom-built HiBob implementation and integration management portal for Digital Directions. Built with Next.js 15, TypeScript, and modern tools.

**Note:** This is a purpose-built portal for Digital Directions - not a white-label solution. All customization happens at the code level.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn UI
- **Authentication:** Clerk (role-based)
- **Database:** Vercel Postgres + Drizzle ORM
- **File Storage:** UploadThing
- **Deployment:** Vercel

## Project Status

✅ Foundation setup complete! The codebase is ready for UI integration from aura.build.

## What's Implemented

### Core Infrastructure
- ✅ Next.js 15 with TypeScript and App Router
- ✅ Tailwind CSS with Shadcn UI components
- ✅ Drizzle ORM with 7 database tables
- ✅ Database indexes for performance
- ✅ Soft delete support (deleted_at fields)

### Authentication & Authorization
- ✅ Clerk integration with ClerkProvider
- ✅ Role-based middleware (admin vs client routes)
- ✅ Webhook handler for user sync
- ✅ Auth helper functions (`getCurrentUser`, `getUserWithProfile`)
- ✅ Simplified user schema (Clerk as source of truth for profile data)

### File Management
- ✅ UploadThing configuration
- ✅ File size limits: 32MB (images, PDFs, docs, zip files)
- ✅ Admin-only agency logo uploads (8MB)

### Database Schema
- ✅ **users** - Simplified (role, agency_id/client_id only)
- ✅ **agencies** - Agency information
- ✅ **clients** - Client companies with status
- ✅ **projects** - Projects with status tracking
- ✅ **files** - File metadata and references
- ✅ **messages** - Project messaging system
- ✅ **client_activity** - Engagement tracking metrics

### Features
- ✅ Error handling with custom error classes
- ✅ TypeScript types for all models
- ✅ Seed script with demo data (4 clients, 4 projects, edge cases)
- ✅ Dashboard layouts (admin and client)
- ✅ Placeholder pages ready for UI integration

## Getting Started

### 1. Set Up Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy your keys to `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

4. Configure webhook:
   - URL: `https://your-domain.vercel.app/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy webhook secret to `CLERK_WEBHOOK_SECRET`

### 2. Set Up Vercel Postgres

1. Create a Vercel project and link this repo
2. Add Vercel Postgres storage in project settings
3. Copy connection strings to `.env.local`:

```env
POSTGRES_URL=postgres://xxxxx
POSTGRES_URL_NON_POOLING=postgres://xxxxx
```

### 3. Set Up UploadThing

1. Create account at [UploadThing](https://uploadthing.com)
2. Create new app
3. Copy credentials to `.env.local`:

```env
UPLOADTHING_SECRET=sk_live_xxxxx
UPLOADTHING_APP_ID=xxxxx
```

### 4. Complete Environment Setup

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

### 5. Push Database Schema

```bash
npm run db:push
```

### 6. Seed Demo Data

```bash
npm run db:seed
```

This creates:
- 1 agency (Digital Directions)
- 4 clients (Meridian Healthcare, Pinnacle Financial, Atlas Manufacturing, Horizon Tech)
- 4 HiBob integration projects with different statuses
- Demo files and messages
- Edge case: Horizon Tech (overdue project, stalled communication)

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Commands

```bash
npm run db:generate    # Generate migrations
npm run db:push        # Push schema to database
npm run db:seed        # Seed demo data
npm run db:studio      # Open Drizzle Studio (GUI)
npm run db:reset       # Drop, recreate, and reseed (dev only)
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Sign-in/sign-up pages
│   ├── (dashboard)/         # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── admin/       # Admin pages
│   │       └── client/      # Client pages
│   └── api/
│       ├── webhooks/clerk/  # Clerk webhook handler
│       └── uploadthing/     # File upload API
├── components/
│   ├── ui/                  # Shadcn components
│   ├── layout/              # Sidebar, Header
│   └── shared/              # Shared components
├── lib/
│   ├── db/
│   │   ├── schema.ts        # Database schema
│   │   └── seed.ts          # Demo data
│   ├── auth.ts              # Auth helpers
│   ├── errors.ts            # Custom errors
│   ├── types.ts             # TypeScript types
│   ├── utils.ts             # Utilities
│   └── uploadthing.ts       # Upload components
└── middleware.ts            # Route protection
```

## Next Steps: UI Integration

1. **Design in aura.build**
   - Create admin dashboard
   - Create client dashboard
   - Design project detail pages
   - Design file management UI
   - Design messaging interface

2. **Export and Integrate**
   - Export HTML/Tailwind from aura.build
   - Replace placeholder pages
   - Wire up components with data from database
   - Use existing types for type safety

3. **Connect Data**
   - Use `getUserWithProfile()` for user data
   - Query database with Drizzle ORM
   - Implement file uploads with UploadButton/UploadDropzone
   - Add real-time messaging (polling for MVP, see plan)

## Key Files for Reference

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Database schema with all tables |
| `src/lib/types.ts` | TypeScript types for all models |
| `src/lib/auth.ts` | Auth helpers and utilities |
| `src/middleware.ts` | Route protection logic |
| `IMPLEMENTATION_PLAN.md` | Detailed technical plan |

## Important Notes

### User Profile Data
Email, name, and avatar are NOT stored in the database. Clerk is the source of truth. Use `getUserWithProfile()` to fetch combined DB + Clerk data for display.

### Soft Deletes
All tables support soft deletes via `deleted_at` field. Records are never truly deleted, allowing data recovery and audit trails.

### File Upload Limits
- Project files: 32MB (images, PDFs, docs, zip)
- Agency logos: 8MB
- Note: UploadThing's free tier has these limits

### Messaging Strategy (MVP)
Using polling (30-second intervals) for simplicity. Upgrade to Server-Sent Events or Pusher for true real-time in Phase 2.

## Production Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add all environment variables
4. Deploy
5. Run `npm run db:push` in Vercel (via terminal or one-time script)
6. Optionally run `npm run db:seed` for demo data

## Demo Data

The seed script includes:
- **Digital Directions** - HiBob consulting agency
- **Meridian Healthcare** - Active client with HiBob → ADP integration in progress
- **Pinnacle Financial** - Active client with onboarding workflow setup in review
- **Atlas Manufacturing** - Active client with completed Greenhouse ATS sync
- **Horizon Tech** - Edge case: archived, overdue BambooHR migration, no communication (3 weeks)

## Support

Refer to `IMPLEMENTATION_PLAN.md` for detailed technical documentation, architecture decisions, and implementation details.

## License

Private project for portfolio demonstration.
