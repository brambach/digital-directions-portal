import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, tickets } from "@/lib/db/schema";
import { isNull, and, eq, count } from "drizzle-orm";
import {
  Users,
  FolderKanban,
  Ticket,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";


export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  pre_sales: "Pre-Sales",
  discovery: "Discovery",
  provisioning: "Provisioning",
  bob_config: "Bob Config",
  mapping: "Mapping",
  build: "Build",
  uat: "UAT",
  go_live: "Go-Live",
  support: "Support",
};

const STAGE_COLORS: Record<string, string> = {
  pre_sales: "bg-slate-400",
  discovery: "bg-sky-500",
  provisioning: "bg-indigo-500",
  bob_config: "bg-violet-500",
  mapping: "bg-purple-500",
  build: "bg-fuchsia-500",
  uat: "bg-amber-500",
  go_live: "bg-emerald-500",
  support: "bg-teal-500",
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_client: "Waiting on Client",
  resolved: "Resolved",
  closed: "Closed",
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  open: "bg-rose-500",
  in_progress: "bg-violet-500",
  waiting_on_client: "bg-amber-500",
  resolved: "bg-emerald-500",
  closed: "bg-slate-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-sky-500",
  high: "bg-orange-500",
  urgent: "bg-rose-500",
};

export default async function AdminReportsPage() {
  await requireAdmin();

  // Fetch all stats in parallel
  const [
    totalClients,
    activeClients,
    totalProjects,
    activeProjects,
    totalTickets,
    openTickets,
    resolvedTickets,
    allProjects,
    allTickets,
  ] = await Promise.all([
    db.select({ count: count() }).from(clients).where(isNull(clients.deletedAt)).then((r) => r[0]?.count || 0),
    db.select({ count: count() }).from(clients).where(and(isNull(clients.deletedAt), eq(clients.status, "active"))).then((r) => r[0]?.count || 0),
    db.select({ count: count() }).from(projects).where(isNull(projects.deletedAt)).then((r) => r[0]?.count || 0),
    db.select({ count: count() }).from(projects).where(and(isNull(projects.deletedAt), eq(projects.status, "in_progress"))).then((r) => r[0]?.count || 0),
    db.select({ count: count() }).from(tickets).where(isNull(tickets.deletedAt)).then((r) => r[0]?.count || 0),
    db.select({ count: count() }).from(tickets).where(and(isNull(tickets.deletedAt), eq(tickets.status, "open"))).then((r) => r[0]?.count || 0),
    db.select({ count: count() }).from(tickets).where(and(isNull(tickets.deletedAt), eq(tickets.status, "resolved"))).then((r) => r[0]?.count || 0),
    db.select({ currentStage: projects.currentStage }).from(projects).where(isNull(projects.deletedAt)),
    db.select({ status: tickets.status, priority: tickets.priority, resolvedAt: tickets.resolvedAt, createdAt: tickets.createdAt }).from(tickets).where(isNull(tickets.deletedAt)),
  ]);

  // Project pipeline by lifecycle stage
  const stageCounts: Record<string, number> = {};
  for (const p of allProjects) {
    stageCounts[p.currentStage] = (stageCounts[p.currentStage] || 0) + 1;
  }

  const stages = Object.keys(STAGE_LABELS);
  const maxStageCount = Math.max(...stages.map((s) => stageCounts[s] || 0), 1);

  // Ticket counts by status
  const ticketStatusCounts: Record<string, number> = {};
  for (const t of allTickets) {
    ticketStatusCounts[t.status] = (ticketStatusCounts[t.status] || 0) + 1;
  }

  // Ticket counts by priority
  const ticketPriorityCounts: Record<string, number> = {};
  for (const t of allTickets) {
    ticketPriorityCounts[t.priority] = (ticketPriorityCounts[t.priority] || 0) + 1;
  }

  // Average resolution time (for resolved tickets)
  const resolvedTicketsList = allTickets.filter(
    (t) => t.resolvedAt && t.createdAt
  );
  const avgResolutionMs =
    resolvedTicketsList.length > 0
      ? resolvedTicketsList.reduce((sum, t) => {
          return sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
        }, 0) / resolvedTicketsList.length
      : 0;
  const avgResolutionHours = Math.round(avgResolutionMs / (1000 * 60 * 60));
  const avgResolutionDisplay =
    avgResolutionHours >= 24
      ? `${Math.round(avgResolutionHours / 24)}d`
      : avgResolutionHours > 0
      ? `${avgResolutionHours}h`
      : "—";

  const STATS = [
    {
      label: "Total Clients",
      value: totalClients.toString(),
      sub: `${activeClients} active`,
      icon: Users,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
    {
      label: "Total Projects",
      value: totalProjects.toString(),
      sub: `${activeProjects} in progress`,
      icon: FolderKanban,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Total Tickets",
      value: totalTickets.toString(),
      sub: `${openTickets} open`,
      icon: Ticket,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      label: "Avg Resolution",
      value: avgResolutionDisplay,
      sub: `${resolvedTicketsList.length} resolved`,
      icon: Clock,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Analytics
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Reports
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <BarChart3 className="w-4 h-4" />
            Overview & metrics
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.iconBg)}>
                  <stat.icon className={cn("w-[18px] h-[18px]", stat.iconColor)} strokeWidth={2} />
                </div>
              </div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{stat.value}</p>
              <p className="text-[12px] text-slate-400 mt-2">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Project Pipeline */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-violet-600" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Project Pipeline</h2>
                <p className="text-[12px] text-slate-400">Projects by lifecycle stage</p>
              </div>
            </div>

            <div className="space-y-3">
              {stages.map((stage) => {
                const stageCount = stageCounts[stage] || 0;
                const pct = totalProjects > 0 ? Math.round((stageCount / totalProjects) * 100) : 0;
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STAGE_COLORS[stage])} />
                        <span className="text-[13px] font-medium text-slate-700">
                          {STAGE_LABELS[stage]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-900 tabular-nums">
                          {stageCount}
                        </span>
                        <span className="text-[11px] text-slate-400 w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", STAGE_COLORS[stage])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket Breakdown */}
          <div className="lg:col-span-5 space-y-5">
            {/* By Status */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-rose-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Tickets by Status</h2>
                  <p className="text-[12px] text-slate-400">{totalTickets} total</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => {
                  const statusCount = ticketStatusCounts[status] || 0;
                  const pct = totalTickets > 0 ? Math.round((statusCount / totalTickets) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", TICKET_STATUS_COLORS[status])} />
                      <span className="text-[13px] font-medium text-slate-700 flex-1">{label}</span>
                      <span className="text-[13px] font-bold text-slate-900 tabular-nums">{statusCount}</span>
                      <span className="text-[11px] text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Visual bar summary */}
              {totalTickets > 0 && (
                <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-slate-100">
                  {Object.entries(TICKET_STATUS_COLORS).map(([status, color]) => {
                    const pct = totalTickets > 0 ? ((ticketStatusCounts[status] || 0) / totalTickets) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={status}
                        className={cn("h-full first:rounded-l-full last:rounded-r-full", color)}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* By Priority */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-amber-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Tickets by Priority</h2>
                  <p className="text-[12px] text-slate-400">Distribution across priorities</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PRIORITY_LABELS).map(([priority, label]) => {
                  const priorityCount = ticketPriorityCounts[priority] || 0;
                  return (
                    <div key={priority} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn("w-2 h-2 rounded-full", PRIORITY_COLORS[priority])} />
                        <span className="text-[12px] font-semibold text-slate-600">{label}</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900 tabular-nums">{priorityCount}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Metrics */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">Resolution Summary</h2>
              <p className="text-[12px] text-slate-400">Ticket resolution performance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{openTickets}</p>
              <p className="text-[12px] text-slate-500 mt-1">Currently Open</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-violet-600 tabular-nums">
                {ticketStatusCounts["in_progress"] || 0}
              </p>
              <p className="text-[12px] text-slate-500 mt-1">In Progress</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                {resolvedTickets}
              </p>
              <p className="text-[12px] text-slate-500 mt-1">Resolved</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {avgResolutionDisplay}
              </p>
              <p className="text-[12px] text-slate-500 mt-1">Avg Resolution Time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
