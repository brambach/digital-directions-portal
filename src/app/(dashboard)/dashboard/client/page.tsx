import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, tickets, integrationMonitors } from "@/lib/db/schema";
import { eq, isNull, and, desc, count, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  FolderKanban,
  Ticket,
  Activity,
  Clock,
  ArrowUpRight,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn, formatMinutesToHours } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DigiFloat } from "@/components/motion/digi-float";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const user = await requireAuth();

  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, user.clientId!), isNull(clients.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] || null);

  if (!client) return null;

  const clientProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, client.id), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));

  const openTicketsCount = await db
    .select({ count: count() })
    .from(tickets)
    .where(and(eq(tickets.clientId, client.id), isNull(tickets.deletedAt), inArray(tickets.status, ["open", "in_progress", "waiting_on_client"])))
    .then((r) => r[0]?.count || 0);

  const activeProjectsCount = clientProjects.filter((p) => !["completed", "on_hold"].includes(p.status)).length;

  const integrationsCount = await db
    .select({ count: count() })
    .from(integrationMonitors)
    .where(and(eq(integrationMonitors.clientId, client.id), isNull(integrationMonitors.deletedAt)))
    .then((r) => r[0]?.count || 0);

  // TODO Sprint 3: Support hours removed in Sprint 2; this stat will be replaced.
  const remainingMinutes = 0;

  const projectIds = clientProjects.map((p) => p.id);

  const pendingTickets = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: tickets.createdAt,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.clientId, client.id),
        isNull(tickets.deletedAt),
        inArray(tickets.status, ["open", "waiting_on_client"])
      )
    )
    .orderBy(desc(tickets.createdAt))
    .limit(4);

  const STATS = [
    {
      label: "Active Projects",
      value: activeProjectsCount.toString(),
      sub: `${clientProjects.length} total`,
      icon: FolderKanban,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      href: "/dashboard/client/projects",
    },
    {
      label: "Open Tickets",
      value: openTicketsCount.toString(),
      sub: pendingTickets.length > 0 ? `${pendingTickets.filter((t) => t.status === "waiting_on_client").length} awaiting you` : "All clear",
      icon: Ticket,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      href: "/dashboard/client/tickets",
    },
    {
      label: "System Health",
      value: integrationsCount > 0 ? `${integrationsCount} Active` : "—",
      sub: integrationsCount > 0 ? "Integrations monitored" : "No monitors configured",
      icon: Activity,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      href: "/dashboard/client/projects",
    },
    {
      label: "Support Hours",
      value: formatMinutesToHours(remainingMinutes),
      sub: remainingMinutes > 0 ? "Available this month" : "Hours depleted",
      icon: Clock,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
      href: "/dashboard/client/tickets",
    },
  ];

  const statusLabels: Record<string, string> = {
    planning: "Planning",
    in_progress: "In Progress",
    review: "In Review",
    completed: "Completed",
    on_hold: "On Hold",
  };

  const statusColors: Record<string, string> = {
    planning: "text-violet-700 bg-violet-50",
    in_progress: "text-violet-700 bg-violet-50",
    review: "text-amber-700 bg-amber-50",
    completed: "text-emerald-700 bg-emerald-50",
    on_hold: "text-slate-600 bg-slate-100",
  };

  const priorityConfig: Record<string, { dot: string; label: string }> = {
    urgent: { dot: "bg-red-500", label: "Urgent" },
    high: { dot: "bg-orange-500", label: "High" },
    medium: { dot: "bg-sky-500", label: "Medium" },
    low: { dot: "bg-slate-400", label: "Low" },
  };

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {client.contactName.split(" ")[0]}&apos;s Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-slate-500 mr-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
            <Link href="/dashboard/client/tickets">
              <Button size="sm" className="rounded-xl font-semibold">
                <HelpCircle className="w-3.5 h-3.5 mr-2" />
                Get Support
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">
        {/* ── Stat Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map((stat) => (
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
              <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{stat.value}</p>
              <div className="mt-3">
                <span className="text-[12px] text-slate-400">{stat.sub}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Main Grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Active Projects */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4 text-violet-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Your Projects</h2>
                  <p className="text-[12px] text-slate-400">{clientProjects.length} projects total</p>
                </div>
              </div>
              <Link
                href="/dashboard/client/projects"
                className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {clientProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DigiFloat variant="neutral" size="sm" className="mb-3" />
                <p className="text-[13px] font-semibold text-slate-700">No projects yet</p>
                <p className="text-[12px] text-slate-400 mt-1">Your projects will appear here once started</p>
              </div>
            ) : (
              <div className="space-y-1">
                {clientProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/client/projects/${project.id}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm shadow-violet-200 group-hover:scale-105 transition-transform">
                      {project.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                        {project.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", statusColors[project.status] || statusColors.planning)}>
                      {statusLabels[project.status] || "Planning"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Action Required + Recent Activity */}
          <div className="lg:col-span-5 space-y-5">
            {/* Action Required */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-800">Action Required</h2>
                    <p className="text-[12px] text-slate-400">Tickets needing your attention</p>
                  </div>
                </div>
                {pendingTickets.length > 0 && (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {pendingTickets.length} pending
                  </span>
                )}
              </div>

              {pendingTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DigiFloat variant="celebrating" size="sm" className="mb-3" />
                  <p className="text-[13px] font-semibold text-slate-700">All caught up!</p>
                  <p className="text-[12px] text-slate-400 mt-1">No tickets need your attention</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingTickets.map((ticket) => {
                    const p = priorityConfig[ticket.priority] || priorityConfig.low;
                    return (
                      <Link
                        key={ticket.id}
                        href={`/dashboard/client/tickets/${ticket.id}`}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group"
                      >
                        <div className="pt-1">
                          <div className={cn("w-2 h-2 rounded-full", p.dot)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 leading-snug truncate group-hover:text-violet-700 transition-colors">
                            {ticket.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {ticket.status === "waiting_on_client" ? "Awaiting your response" : "Open"} · {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                  <Link
                    href="/dashboard/client/tickets"
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-[12px] font-semibold text-slate-500 hover:text-violet-600 transition-colors"
                  >
                    View all tickets <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
