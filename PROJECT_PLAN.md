# Digital Directions Client Portal
## Project Plan & Timeline

**Last Updated:** January 13, 2026
**Status:** Approved - In Development
**Target Launch:** February 3, 2026

---

## Monthly Infrastructure Costs

### Core Services (Required)

| Service | Purpose | Tier | Monthly Cost |
|---------|---------|------|--------------|
| **Vercel** | Hosting & deployment | Pro | $20 |
| **Vercel Postgres (Neon)** | Database | Scale | $19 |
| **Clerk** | Authentication | Pro (up to 10k MAUs) | $25 |
| **UploadThing** | File storage & uploads | Pro (100GB) | $20 |
| **Resend** | Transactional emails | Pro (50k emails/mo) | $20 |
| **Domain** | digitaldirections.io | Annual / 12 | ~$1 |
| | | **Total** | **$105/month** |

**Annual Cost:** $1,260/year

### Optional Services

| Service | Purpose | Monthly Cost | Priority |
|---------|---------|--------------|----------|
| **Sentry** | Error tracking & monitoring | $26 | Recommended |
| **Freshdesk** | Helpdesk integration for tickets | $0-15/agent | Phase 2 |
| **Slack** | Team notifications | $0 (free tier) | Phase 2 |

**With Monitoring:** $131/month ($1,572/year)
**With Monitoring + Freshdesk Growth (3 agents):** $176/month ($2,112/year)

---

## Software & Tools Stack

### Production Infrastructure

**Frontend:**
- Next.js 15.1 (React 18)
- TypeScript 5.x
- Tailwind CSS 3.4
- Shadcn/ui components

**Backend:**
- Next.js API Routes (Node.js)
- Drizzle ORM
- Vercel Postgres (PostgreSQL 15)

**Authentication:**
- Clerk (includes MFA, session management, user profiles)

**File Storage:**
- UploadThing (AWS S3 backed)
- Automatic image optimization
- Virus scanning included

**Email:**
- Resend API
- SPF/DKIM/DMARC support
- Delivery tracking

**Hosting:**
- Vercel (global CDN)
- Automatic SSL
- Zero-downtime deployments
- Built-in analytics

### Development Tools (Free/Included)

- **VS Code** - Code editor
- **Git/GitHub** - Version control
- **Drizzle Kit** - Database migrations
- **ESLint/Prettier** - Code quality
- **TypeScript** - Type safety

---

## Project Timeline

### Week 1: Production Preparation (Jan 13-19)

**Domain & Email Setup**
- [ ] Get DNS access for digitaldirections.io
- [ ] Verify domain in Resend
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Update EMAIL_FROM in production environment
- [ ] Test email delivery

**Production Environment**
- [ ] Set up Vercel production project
- [ ] Configure all environment variables
- [ ] Set up production database (Vercel Postgres)
- [ ] Run database migrations
- [ ] Configure custom domain
- [ ] Set up SSL certificates

**Security & Performance**
- [ ] Security audit checklist
- [ ] Set up Sentry error tracking (optional)
- [ ] Configure rate limiting
- [ ] Performance optimization pass
- [ ] Mobile responsiveness check

**Estimated Time:** 15-20 hours

---

### Week 2: Testing & Refinement (Jan 20-26)

**Internal Testing**
- [ ] Create test admin accounts for team
- [ ] Create test client accounts
- [ ] Test all critical flows:
  - Client creation & invite system
  - Project creation & updates
  - File uploads & downloads
  - Message sending & receiving
  - Ticket creation & responses
- [ ] Fix any bugs discovered
- [ ] Performance testing with realistic data

**UI Polish**
- [ ] Consistent spacing and typography
- [ ] Loading states for all actions
- [ ] Empty states with helpful messaging
- [ ] Error messages are user-friendly
- [ ] Mobile UX improvements
- [ ] Dark mode support (optional)

**Beta Client Selection**
- [ ] Choose 1-2 friendly clients for beta
- [ ] Prepare onboarding materials
- [ ] Create client accounts
- [ ] Set up their initial projects

**Estimated Time:** 20-25 hours

---

### Week 3: Launch Preparation (Jan 27 - Feb 2)

**Documentation**
- [ ] Admin guide (how to manage clients/projects)
- [ ] Client user guide (how to use portal)
- [ ] Video walkthrough (5 min Loom)
- [ ] FAQ document
- [ ] Support process documentation

**Beta Launch**
- [ ] Onboard beta clients
- [ ] Monitor usage and collect feedback
- [ ] Daily check-ins for first 3 days
- [ ] Fix critical issues immediately
- [ ] Iterate based on feedback

**Team Training**
- [ ] Train admin team on portal management
- [ ] Document common support issues
- [ ] Set up internal support process

**Final Checklist**
- [ ] All email notifications working
- [ ] File uploads working reliably
- [ ] Mobile experience is solid
- [ ] No critical bugs
- [ ] Performance is good (< 2s page loads)

**Estimated Time:** 15-20 hours

---

### Week 4: Full Rollout (Feb 3-9)

**Production Launch**
- [ ] Announce portal to all active clients
- [ ] Send invitation emails in batches
- [ ] Monitor for issues
- [ ] Provide support for onboarding questions

**Monitoring**
- [ ] Track daily active users
- [ ] Monitor error rates (Sentry)
- [ ] Track email delivery rates
- [ ] Gather client feedback

**Iteration**
- [ ] Address any issues that arise
- [ ] Quick UX improvements based on feedback
- [ ] Update documentation as needed

**Estimated Time:** 10-15 hours

---

## Total Development Effort

| Phase | Hours | Status |
|-------|-------|--------|
| **Initial Development** (completed) | 40 | ✅ Done |
| **Week 1: Production Prep** | 15-20 | 🔜 Upcoming |
| **Week 2: Testing & Polish** | 20-25 | 🔜 Upcoming |
| **Week 3: Launch Prep** | 15-20 | 🔜 Upcoming |
| **Week 4: Rollout** | 10-15 | 🔜 Upcoming |
| **Total** | **100-120 hours** | |

---

## Critical Path Items

These items are **blocking** and must be completed first:

### 🚨 Week 1 Blockers
1. **Domain verification in Resend** - Required for email invites to work
2. **Production deployment** - Need live environment for testing
3. **Environment variables configured** - All services must be set up

### ⚠️ Week 2 Dependencies
1. Week 1 must be complete before beta testing
2. Need at least 1 willing beta client identified
3. Internal team must test before clients see it

### ✅ Week 3 Prerequisites
1. Beta feedback collected
2. Critical bugs fixed
3. Documentation complete

---

## Risk Management

### Technical Risks

**Email Deliverability (Medium)**
- **Risk:** Emails go to spam or don't deliver
- **Mitigation:** Proper SPF/DKIM/DMARC setup, use verified domain
- **Timeline Impact:** Could delay by 1-3 days if DNS issues

**Performance Issues (Low)**
- **Risk:** Slow page loads with many files/messages
- **Mitigation:** Database indexing already in place, pagination implemented
- **Timeline Impact:** 1-2 days for optimization if needed

**Hosting Stability (Low)**
- **Risk:** Vercel downtime
- **Mitigation:** 99.99% SLA, automatic scaling
- **Timeline Impact:** Minimal, outside our control

### Business Risks

**Low Client Adoption (Medium)**
- **Risk:** Clients don't use the portal
- **Mitigation:** Personal onboarding, training materials, make it easy
- **Timeline Impact:** Doesn't affect launch timeline

**Beta Issues (Low-Medium)**
- **Risk:** Beta clients find major problems
- **Mitigation:** Choose friendly/forgiving beta clients, fix issues quickly
- **Timeline Impact:** Could extend Week 3 by 2-3 days

---

## Success Metrics (First 30 Days)

**Technical Success:**
- 99.5%+ uptime
- < 2 second page load times
- Zero security incidents
- < 1% error rate

**Adoption Success:**
- 50%+ of invited clients create accounts (Week 1)
- 70%+ of accounts log in at least once per week
- 3+ average actions per session (view project, download file, etc.)

**Support Success:**
- < 5 support tickets related to portal bugs
- Average resolution time < 24 hours
- Positive feedback from 80%+ of surveyed clients

---

## Post-Launch Roadmap (Phase 2)

**Q1 2026 (Feb-Mar):**
- Freshdesk integration for ticket management
- Slack notifications for team
- Enhanced mobile experience
- Client analytics dashboard

**Q2 2026 (Apr-Jun):**
- Advanced reporting
- Document e-signatures
- Calendar integration for meetings
- Custom email templates

**Q3 2026:**
- Mobile app (React Native)
- HiBob API integration (if applicable)
- White-label resale opportunity

---

## Key Contacts & Access

**Required Access:**
- [ ] DNS management for digitaldirections.io (for Bryon/IT)
- [ ] Vercel team account
- [ ] Shared 1Password vault for credentials
- [ ] GitHub repository access for Jack (if reviewing code)

**Service Accounts:**
- Vercel: bryce@digitaldirections.io (or appropriate email)
- Clerk: Same
- Resend: Same
- UploadThing: Same
- Neon/Postgres: Managed through Vercel

---

## Budget Summary

### One-Time Costs
- Development (remaining): ~60-80 hours @ agreed rate
- Already completed: 40 hours
- Domain registration: ~$15/year

### Recurring Costs (Monthly)
- **Core infrastructure:** $105/month
- **With monitoring:** $131/month
- **Fully loaded (all integrations):** $139/month

### Annual Budget
- **Infrastructure:** $1,260-$1,668/year
- **Maintenance:** 4-8 hours/month (ongoing support)

---

## Next Steps (This Week)

1. **Today:** Get DNS access for domain verification
2. **Tomorrow:** Set up production Vercel environment
3. **This Week:** Complete domain verification and email testing
4. **By Friday:** Have production environment fully configured

---

## Questions & Decisions Needed

- [ ] Who has DNS access for digitaldirections.io?
- [ ] Which 1-2 clients should we use for beta testing?
- [ ] Who will be the primary portal admin for day-to-day management?
- [ ] What's our support SLA? (e.g., respond within 4 hours)
- [ ] Do we need Sentry monitoring ($26/mo) or start without it?

---

**Document Owner:** Bryce Rambach
**Last Review:** January 13, 2026
**Next Review:** Weekly during development
