import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrationMonitors, integrationMetrics, projects, clients, invites } from "@/lib/db/schema";
import { isNull, eq, and, gte, lte, ne, gt, sql } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  FolderKanban,
  ArrowUpRight,
  Clock,
  ChevronRight,
  UserPlus,
  CalendarClock,
  ExternalLink,
  Headphones,
  RefreshCw,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DigiFloat } from "@/components/motion/digi-float";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger-container";
import { CountUp } from "@/components/motion/count-up";
import { ConnectorHealthNetwork } from "@/components/connector-health-network";
import { CancelInviteButton } from "@/components/cancel-invite-button";

export const dynamic = "force-dynamic";

type IntegrationStatus = "healthy" | "degraded" | "down" | "unknown";

const SERVICE_CONFIG: Record<string, { name: string; abbr: string }> = {
  hibob: { name: "HiBob", abbr: "HB" },
  keypay: { name: "KeyPay", abbr: "KP" },
  workato: { name: "Workato", abbr: "WK" },
  netsuite: { name: "NetSuite", abbr: "NS" },
  deputy: { name: "Deputy", abbr: "DP" },
  myob: { name: "MYOB", abbr: "MY" },
};

const SERVICE_ORDER = ["hibob", "workato", "keypay", "myob", "deputy", "netsuite"];

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}


const STAGE_LABELS: Record<string, string> = {
  pre_sales:    "Pre-Sales",
  discovery:    "Discovery",
  provisioning: "Provisioning",
  bob_config:   "Bob Config",
  mapping:      "Mapping",
  build:        "Build",
  uat:          "UAT",
  go_live:      "Go-Live",
  support:      "Support",
};

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pre_sales:    { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  discovery:    { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500"     },
  provisioning: { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500"  },
  bob_config:   { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500"  },
  mapping:      { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500"  },
  build:        { bg: "bg-fuchsia-50", text: "text-fuchsia-700", dot: "bg-fuchsia-500" },
  uat:          { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  go_live:      { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  support:      { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500"    },
};

const STAGE_ORDER = ["pre_sales", "discovery", "provisioning", "bob_config", "mapping", "build", "uat", "go_live", "support"];

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  await requireAdmin();

  const now = new Date();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ── Real DB queries ──────────────────────────────────────────────────────
  const [projectStats, clientCounts, dueSoonRows, pendingInviteRows] = await Promise.all([
    // Project counts for stat cards
    db.select({
      total:  sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where current_stage != 'support')::int`,
    }).from(projects).where(isNull(projects.deletedAt)),

    // Client counts: total + active
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
    }).from(clients).where(isNull(clients.deletedAt)),

    // Projects due in the next 14 days (including overdue), not in support stage
    db.select({
      id: projects.id,
      name: projects.name,
      currentStage: projects.currentStage,
      dueDate: projects.dueDate,
      clientName: clients.companyName,
    })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(
        isNull(projects.deletedAt),
        ne(projects.currentStage, "support"),
        lte(projects.dueDate, fourteenDaysFromNow),
      ))
      .orderBy(projects.dueDate)
      .limit(5),

    // Pending invites (not accepted, not expired)
    db.select({
      id: invites.id,
      email: invites.email,
      clientName: clients.companyName,
      createdAt: invites.createdAt,
    })
      .from(invites)
      .leftJoin(clients, eq(invites.clientId, clients.id))
      .where(and(
        eq(invites.status, "pending"),
        gt(invites.expiresAt, now),
      ))
      .orderBy(invites.createdAt)
      .limit(5),
  ]);

  // ── Derived values ───────────────────────────────────────────────────────
  const totalProjects      = projectStats[0]?.total  ?? 0;
  const activeProjectCount = projectStats[0]?.active ?? 0;

  const dueThisWeekCount = dueSoonRows.filter(p => p.dueDate && p.dueDate <= sevenDaysFromNow).length;
  const overdueCount = dueSoonRows.filter(p => p.dueDate && p.dueDate < now).length;
  const totalClients = clientCounts[0]?.total ?? 0;
  const activeClients = clientCounts[0]?.active ?? 0;

  const PROJECTS_DUE_SOON = dueSoonRows.map(p => ({
    id: p.id,
    name: p.name,
    client: p.clientName ?? "Unknown",
    currentStage: p.currentStage,
    daysLeft: p.dueDate ? Math.ceil((p.dueDate.getTime() - now.getTime()) / 86400000) : null,
    isOverdue: p.dueDate ? p.dueDate < now : false,
  }));

  const PENDING_INVITES = pendingInviteRows.map(i => ({
    id: i.id,
    email: i.email,
    client: i.clientName ?? "DD Team",
    sentAt: formatDistanceToNow(i.createdAt, { addSuffix: true }),
  }));

  const STATS = [
    {
      label: "Active Projects",
      value: String(activeProjectCount),
      sub: `${totalProjects} total projects`,
      icon: FolderKanban,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      trend: `${totalProjects} total`,
      trendUp: true,
      href: "/dashboard/admin/projects",
    },
    {
      label: "Due This Week",
      value: String(dueThisWeekCount),
      sub: overdueCount > 0 ? `${overdueCount} overdue` : "None overdue",
      icon: CalendarClock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      trend: overdueCount > 0 ? `${overdueCount} past due` : "On track",
      trendUp: overdueCount === 0,
      href: "/dashboard/admin/projects",
    },
    {
      label: "Total Clients",
      value: String(totalClients),
      sub: `${activeClients} active`,
      icon: Users,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
      trend: `${totalClients - activeClients} inactive`,
      trendUp: true,
      href: "/dashboard/admin/clients",
    },
  ];

  // ── Project pipeline: actual projects with lifecycle stages ─────────────
  const projectListRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      currentStage: projects.currentStage,
      dueDate: projects.dueDate,
      clientName: clients.companyName,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(isNull(projects.deletedAt), ne(projects.currentStage, "support")))
    .limit(8);

  const PROJECT_PIPELINE = [...projectListRows].sort((a, b) => {
    const aIdx = STAGE_ORDER.indexOf(a.currentStage ?? "");
    const bIdx = STAGE_ORDER.indexOf(b.currentStage ?? "");
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  // ── Integration Health (real data from DB) ──────────────────────────────
  const monitors = await db
    .select()
    .from(integrationMonitors)
    .where(
      and(
        eq(integrationMonitors.isEnabled, true),
        isNull(integrationMonitors.deletedAt)
      )
    );

  // Compute uptime from metrics (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const uptimeData =
    monitors.length > 0
      ? await db
          .select({
            serviceType: integrationMonitors.serviceType,
            total: sql<number>`count(*)::int`,
            healthyCount: sql<number>`count(*) filter (where ${integrationMetrics.status} = 'healthy')::int`,
          })
          .from(integrationMetrics)
          .innerJoin(
            integrationMonitors,
            eq(integrationMetrics.monitorId, integrationMonitors.id)
          )
          .where(
            and(
              gte(integrationMetrics.checkedAt, thirtyDaysAgo),
              isNull(integrationMonitors.deletedAt),
              eq(integrationMonitors.isEnabled, true)
            )
          )
          .groupBy(integrationMonitors.serviceType)
      : [];

  // Group monitors by service type
  const serviceMap = new Map<string, (typeof monitors)[number][]>();
  for (const m of monitors) {
    const group = serviceMap.get(m.serviceType) ?? [];
    group.push(m);
    serviceMap.set(m.serviceType, group);
  }

  // Build uptime lookup
  const uptimeMap = new Map<string, number>();
  for (const row of uptimeData) {
    if (row.total > 0) {
      uptimeMap.set(row.serviceType, (row.healthyCount / row.total) * 100);
    }
  }

  const statusRank: Record<string, number> = {
    down: 0,
    degraded: 1,
    unknown: 2,
    healthy: 3,
  };

  // Build integration nodes from real data
  const integrationHealth: {
    id: string;
    name: string;
    abbr: string;
    status: IntegrationStatus;
    lastChecked: string;
    uptime: string;
    incident?: string;
  }[] = Array.from(serviceMap.entries())
    .map(([serviceType, group]) => {
      const config = SERVICE_CONFIG[serviceType];

      let worstStatus: IntegrationStatus = "healthy";
      let mostRecentCheck: Date | null = null;
      let incident: string | undefined;

      for (const m of group) {
        const status = (m.currentStatus ?? "unknown") as IntegrationStatus;
        if ((statusRank[status] ?? 2) < (statusRank[worstStatus] ?? 2)) {
          worstStatus = status;
          if (m.lastErrorMessage) incident = m.lastErrorMessage;
        }
        if (
          m.lastCheckedAt &&
          (!mostRecentCheck || m.lastCheckedAt > mostRecentCheck)
        ) {
          mostRecentCheck = m.lastCheckedAt;
        }
      }

      const uptime = uptimeMap.get(serviceType);

      return {
        id: serviceType,
        name: config?.name ?? serviceType,
        abbr: config?.abbr ?? serviceType.substring(0, 2).toUpperCase(),
        status: worstStatus,
        lastChecked: mostRecentCheck
          ? formatRelativeTime(mostRecentCheck)
          : "Never",
        uptime: uptime !== undefined ? `${uptime.toFixed(1)}%` : "—",
        incident,
      };
    })
    .sort((a, b) => {
      const aIdx = SERVICE_ORDER.indexOf(a.id);
      const bIdx = SERVICE_ORDER.indexOf(b.id);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

  const healthyCount = integrationHealth.filter(
    (i) => i.status === "healthy"
  ).length;
  const degradedCount = integrationHealth.filter(
    (i) => i.status === "degraded"
  ).length;
  const downCount = integrationHealth.filter(
    (i) => i.status === "down"
  ).length;

  const mostRecentGlobalCheck = monitors.reduce<Date | null>((latest, m) => {
    if (!m.lastCheckedAt) return latest;
    return !latest || m.lastCheckedAt > latest ? m.lastCheckedAt : latest;
  }, null);

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="bg-white border-b border-slate-100 px-7 py-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
                <span className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  downCount > 0 ? "bg-red-500" : degradedCount > 0 ? "bg-amber-500" : "bg-emerald-500"
                )} />
                {downCount > 0
                  ? "Systems experiencing issues"
                  : degradedCount > 0
                    ? "Some systems degraded"
                    : "All systems operational"}
              </span>
              {/* Freshdesk: support@digitaldirections.io routes here */}
              <a
                href="https://digitaldirections-help.freshdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-[12px] font-semibold text-violet-700 transition-colors"
              >
                <Headphones className="w-3.5 h-3.5" />
                Open Freshdesk
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>
        </div>
      </FadeIn>

      <StaggerContainer className="px-7 py-6 space-y-6">

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STATS.map((stat) => {
              const numericValue = parseFloat(stat.value);
              const isInteger = Number.isInteger(numericValue);
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.iconBg)}>
                      <stat.icon className={cn("w-[18px] h-[18px]", stat.iconColor)} strokeWidth={2} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {isInteger ? <CountUp value={numericValue} /> : stat.value}
                  </p>
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
              );
            })}
          </div>
        </StaggerItem>

        {/* ── Main Grid: Pipeline + Connector Health ────────────────── */}
        <StaggerItem>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Project Pipeline */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
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

              {PROJECT_PIPELINE.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderKanban className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-[13px] font-semibold text-slate-600">No active projects</p>
                  <p className="text-[12px] text-slate-400 mt-1">Projects will appear here as they progress</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {PROJECT_PIPELINE.map((project) => {
                    const stage = project.currentStage ?? "pre_sales";
                    const stageColors = STAGE_COLORS[stage] ?? STAGE_COLORS.pre_sales;
                    const stageLabel = STAGE_LABELS[stage] ?? stage;
                    const daysLeft = project.dueDate ? Math.ceil((project.dueDate.getTime() - now.getTime()) / 86400000) : null;
                    const isOverdue = project.dueDate ? project.dueDate < now : false;
                    return (
                      <Link
                        key={project.id}
                        href={`/dashboard/admin/projects/${project.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                            {project.name}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{project.clientName ?? "Unknown"}</p>
                        </div>
                        <span className={cn(
                          "flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                          stageColors.bg, stageColors.text
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", stageColors.dot)} />
                          {stageLabel}
                        </span>
                        {daysLeft !== null && (
                          <span className={cn(
                            "flex-shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg",
                            isOverdue ? "bg-red-50 text-red-600" : daysLeft <= 3 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"
                          )}>
                            <Clock className="w-3 h-3" />
                            {isOverdue ? "Overdue" : daysLeft === 0 ? "Today" : `${daysLeft}d`}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Connector Health */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-violet-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-800">Connector Health</h2>
                    <p className="text-[12px] text-slate-400">Live integration status</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <RefreshCw className="w-3 h-3" />
                  <span>{mostRecentGlobalCheck ? formatRelativeTime(mostRecentGlobalCheck) : "No checks"}</span>
                </div>
              </div>

              {/* Status summary badges */}
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {healthyCount} Healthy
                </span>
                {degradedCount > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {degradedCount} Degraded
                  </span>
                )}
                {downCount > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                    {downCount} Down
                  </span>
                )}
              </div>

              {integrationHealth.length >= 3 ? (
                <ConnectorHealthNetwork integrations={integrationHealth} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Wifi className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-[13px] font-semibold text-slate-600">No integrations monitored yet</p>
                  <p className="text-[12px] text-slate-400 mt-1">
                    Configure integration monitors on project pages to see live status here
                  </p>
                </div>
              )}
            </div>
          </div>
        </StaggerItem>

        {/* ── Due Soon + Pending Invites + Freshdesk ──────────────────── */}
        <StaggerItem>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Projects Due Soon */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <CalendarClock className="w-4 h-4 text-amber-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-800">Due Soon</h2>
                    <p className="text-[12px] text-slate-400">Next 14 days</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/admin/projects"
                  className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-1">
                {PROJECTS_DUE_SOON.map((project) => {
                  const stageColors = STAGE_COLORS[project.currentStage] ?? STAGE_COLORS.discovery;
                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/admin/projects/${project.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", stageColors.dot)} />
                          <p className="text-[11px] text-slate-400">{project.client} · {STAGE_LABELS[project.currentStage]}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "flex-shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg",
                        project.isOverdue
                          ? "bg-red-50 text-red-600"
                          : (project.daysLeft ?? 99) <= 3
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-50 text-slate-500"
                      )}>
                        <Clock className="w-3 h-3" />
                        {project.isOverdue ? "Overdue" : project.daysLeft === 0 ? "Today" : project.daysLeft != null ? `${project.daysLeft}d` : "TBD"}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right sidebar: Pending Invites + Freshdesk */}
            <div className="lg:col-span-4 flex flex-col gap-4">

              {/* Pending Invites */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-sky-600" strokeWidth={2} />
                    </div>
                    <h2 className="text-[14px] font-bold text-slate-800">Pending Invites</h2>
                  </div>
                  {PENDING_INVITES.length > 0 && (
                    <span className="text-[11px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                      {PENDING_INVITES.length}
                    </span>
                  )}
                </div>

                {PENDING_INVITES.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <DigiFloat variant="celebrating" size="sm" className="mb-2" />
                    <p className="text-[12px] font-semibold text-slate-700">All caught up</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No pending invitations</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {PENDING_INVITES.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[11px] font-bold">{invite.email.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-800 truncate">{invite.email}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{invite.client} · {invite.sentAt}</p>
                        </div>
                        <CancelInviteButton inviteId={invite.id} />
                      </div>
                    ))}
                    <Link
                      href="/dashboard/admin/clients"
                      className="flex items-center justify-center gap-1 w-full pt-1 text-[11px] font-semibold text-slate-400 hover:text-violet-600 transition-colors"
                    >
                      Manage invites <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Freshdesk: support@digitaldirections.io routes here */}
              <a
                href="https://digitaldirections-help.freshdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-4.5 h-4.5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white">Open Freshdesk</p>
                  <p className="text-[11px] text-violet-200 mt-0.5">Manage support tickets</p>
                </div>
                <ExternalLink className="w-4 h-4 text-violet-300 group-hover:text-white transition-colors flex-shrink-0" />
              </a>

            </div>
          </div>
        </StaggerItem>

      </StaggerContainer>
    </div>
  );
}