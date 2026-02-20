import { requireAdmin } from "@/lib/auth";
import {
  Users,
  Ticket,
  FolderKanban,
  Activity,
  ArrowUpRight,
  Clock,
  ChevronRight,
  AlertCircle,
  Mail,
  UserPlus,
  CheckCircle2,
  Circle,
  Timer,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedProgressBar } from "@/components/animated-progress-bar";

export const dynamic = "force-dynamic";

// ─── Mock data (UI-first pass — wire up real queries after) ───────────────────

const STATS = [
  {
    label: "Active Projects",
    value: "8",
    sub: "3 in review",
    icon: FolderKanban,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    trend: "+2 this month",
    trendUp: true,
    href: "/dashboard/admin/projects",
  },
  {
    label: "Open Tickets",
    value: "5",
    sub: "2 urgent",
    icon: Ticket,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    trend: "1 unassigned",
    trendUp: false,
    href: "/dashboard/admin/tickets",
  },
  {
    label: "Total Clients",
    value: "12",
    sub: "10 active",
    icon: Users,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    trend: "+1 this month",
    trendUp: true,
    href: "/dashboard/admin/clients",
  },
  {
    label: "Platform Health",
    value: "99.9%",
    sub: "All systems go",
    icon: Activity,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    trend: "Uptime 30 days",
    trendUp: true,
    href: "/dashboard/admin/settings",
  },
];

const PIPELINE = [
  { key: "in_progress", label: "In Progress", count: 8, total: 28, color: "bg-violet-500" },
  { key: "planning",    label: "Planning",     count: 5, total: 28, color: "bg-sky-500" },
  { key: "review",      label: "In Review",    count: 3, total: 28, color: "bg-amber-500" },
  { key: "completed",   label: "Completed",    count: 10, total: 28, color: "bg-emerald-500" },
  { key: "on_hold",     label: "On Hold",      count: 2, total: 28, color: "bg-slate-400" },
];

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  urgent:  { label: "Urgent",  dot: "bg-rose-500",   bg: "bg-rose-50",   text: "text-rose-700" },
  high:    { label: "High",    dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700" },
  medium:  { label: "Medium",  dot: "bg-amber-500",  bg: "bg-amber-50",  text: "text-amber-700" },
  low:     { label: "Low",     dot: "bg-slate-400",  bg: "bg-slate-100", text: "text-slate-600" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  open:              { icon: Circle,       color: "text-rose-500",   label: "Open" },
  in_progress:       { icon: Timer,        color: "text-violet-600", label: "In Progress" },
  waiting_on_client: { icon: Clock,        color: "text-amber-500",  label: "Waiting" },
  resolved:          { icon: CheckCircle2, color: "text-emerald-500",label: "Resolved" },
};

const RECENT_TICKETS = [
  { id: "t1", title: "KeyPay employee sync failing for new starters", client: "Meridian Healthcare", priority: "urgent", status: "open",        time: "12 min ago" },
  { id: "t2", title: "Unable to access portal files section",         client: "TechFlow Solutions", priority: "medium", status: "in_progress",  time: "2 hrs ago"  },
  { id: "t3", title: "Leave balance not updating after approval",     client: "Pacific Retail",     priority: "high",   status: "open",         time: "5 hrs ago"  },
  { id: "t4", title: "MicrOpay integration timeout on large exports", client: "Darrell Lea",        priority: "high",   status: "waiting_on_client", time: "1 day ago" },
  { id: "t5", title: "New employee not appearing in KeyPay",          client: "SwyftX",             priority: "low",    status: "in_progress",  time: "2 days ago" },
];

const UNASSIGNED_TICKETS = [
  { id: "u1", title: "Pay run not triggered after HiBob approval", client: "Credit Corp",     priority: "urgent", createdAt: "45 min ago" },
  { id: "u2", title: "Webhook queue backing up — 34 items",        client: "Moore Australia", priority: "high",   createdAt: "3 hrs ago"  },
];

const PENDING_INVITES = [
  { id: "i1", email: "sarah.nguyen@meridianhealth.com.au", client: "Meridian Healthcare", sentAt: "3 days ago",  role: "client" },
  { id: "i2", email: "james.ko@techflowsolutions.com",     client: "TechFlow Solutions",  sentAt: "5 days ago",  role: "client" },
  { id: "i3", email: "bryon@digitaldirections.io",         client: "Digital Directions",  sentAt: "6 days ago",  role: "admin"  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  await requireAdmin();

  const totalProjects = PIPELINE.reduce((s, p) => s + p.count, 0);

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="animate-dashboard-reveal bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(
                "animate-dashboard-reveal group bg-white rounded-2xl border border-slate-100 p-5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all duration-200",
                // stagger each card: 80ms, 140ms, 200ms, 260ms
                i === 0 && "stagger-2",
                i === 1 && "stagger-3",
                i === 2 && "stagger-4",
                i === 3 && "stagger-5",
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.iconBg)}>
                  <stat.icon className={cn("w-[18px] h-[18px]", stat.iconColor)} strokeWidth={2} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{stat.value}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-slate-400">{stat.sub}</span>
                <span className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  stat.trendUp ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50"
                )}>
                  {stat.trend}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Main Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Project Pipeline */}
          <div className="animate-dashboard-reveal stagger-6 lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4 text-violet-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Project Pipeline</h2>
                  <p className="text-[12px] text-slate-400">{totalProjects} projects total</p>
                </div>
              </div>
              <Link
                href="/dashboard/admin/projects"
                className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {PIPELINE.map((item, i) => {
                const pct = Math.round((item.count / item.total) * 100);
                // Stagger each bar 100ms apart, starting after the card has appeared
                const barDelay = 650 + i * 100;
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", item.color)} />
                        <span className="text-[13px] font-medium text-slate-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-900 tabular-nums">{item.count}</span>
                        <span className="text-[11px] text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <AnimatedProgressBar pct={pct} color={item.color} delayMs={barDelay} />
                  </div>
                );
              })}
            </div>

            {/* Pipeline summary row */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{PIPELINE.find(p => p.key === "in_progress")?.count ?? 0}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Active now</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{PIPELINE.find(p => p.key === "review")?.count ?? 0}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Awaiting review</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-600 tabular-nums">{PIPELINE.find(p => p.key === "completed")?.count ?? 0}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Completed</p>
              </div>
            </div>
          </div>

          {/* Recent Tickets */}
          <div className="animate-dashboard-reveal stagger-7 lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-rose-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Recent Tickets</h2>
                  <p className="text-[12px] text-slate-400">Latest support activity</p>
                </div>
              </div>
              <Link
                href="/dashboard/admin/tickets"
                className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-1">
              {RECENT_TICKETS.map((ticket) => {
                const p = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.low;
                const s = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
                const StatusIcon = s.icon;
                return (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/admin/tickets/${ticket.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <StatusIcon className={cn("w-4 h-4 flex-shrink-0", s.color)} strokeWidth={2} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                        {ticket.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ticket.client} · {ticket.time}</p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", p.bg, p.text)}>
                      {p.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Actions Needed ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Unassigned Tickets */}
          <div className="animate-dashboard-reveal stagger-8 bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-amber-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Needs Attention</h2>
                  <p className="text-[12px] text-slate-400">Unassigned tickets</p>
                </div>
              </div>
              {UNASSIGNED_TICKETS.length > 0 && (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {UNASSIGNED_TICKETS.length} open
                </span>
              )}
            </div>

            {UNASSIGNED_TICKETS.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-[13px] font-semibold text-slate-700">All tickets assigned</p>
                <p className="text-[12px] text-slate-400 mt-1">Nothing needs immediate attention</p>
              </div>
            ) : (
              <div className="space-y-3">
                {UNASSIGNED_TICKETS.map((ticket) => {
                  const p = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.low;
                  return (
                    <div
                      key={ticket.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all"
                    >
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[13px] font-semibold text-slate-800 leading-snug">{ticket.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", p.bg, p.text)}>
                            {p.label}
                          </span>
                          <span className="text-[11px] text-slate-400">{ticket.client}</span>
                          <span className="text-[11px] text-slate-400">· {ticket.createdAt}</span>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/admin/tickets/${ticket.id}`}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold transition-colors"
                      >
                        <Zap className="w-3 h-3" />
                        Claim
                      </Link>
                    </div>
                  );
                })}
                <Link
                  href="/dashboard/admin/tickets"
                  className="flex items-center justify-center gap-1.5 w-full py-2 text-[12px] font-semibold text-slate-500 hover:text-violet-600 transition-colors"
                >
                  View all tickets <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Pending Invites */}
          <div className="animate-dashboard-reveal stagger-8 bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-sky-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Pending Invites</h2>
                  <p className="text-[12px] text-slate-400">Awaiting acceptance</p>
                </div>
              </div>
              {PENDING_INVITES.length > 0 && (
                <span className="text-[11px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                  {PENDING_INVITES.length} pending
                </span>
              )}
            </div>

            {PENDING_INVITES.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-[13px] font-semibold text-slate-700">No pending invites</p>
                <p className="text-[12px] text-slate-400 mt-1">All invitations have been accepted</p>
              </div>
            ) : (
              <div className="space-y-3">
                {PENDING_INVITES.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/30 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[12px] font-bold">
                        {invite.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{invite.email}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{invite.client} · Sent {invite.sentAt}</p>
                    </div>
                    <button className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-600 hover:text-sky-700 text-[12px] font-semibold transition-all">
                      <Mail className="w-3 h-3" />
                      Resend
                    </button>
                  </div>
                ))}
                <Link
                  href="/dashboard/admin/clients"
                  className="flex items-center justify-center gap-1.5 w-full py-2 text-[12px] font-semibold text-slate-500 hover:text-violet-600 transition-colors"
                >
                  Manage invites <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
