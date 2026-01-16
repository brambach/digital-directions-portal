import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, tickets, users } from "@/lib/db/schema";
import { isNull, eq, and, sql, desc, or, count } from "drizzle-orm";
import {
  Users,
  Ticket,
  AlertTriangle,
  Building2,
  FolderKanban,
  ArrowRight,
  LayoutDashboard,
  UserPlus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import dynamicImport from "next/dynamic";

const InviteTeamMemberDialog = dynamicImport(
  () => import("@/components/invite-team-member-dialog").then((mod) => ({ default: mod.InviteTeamMemberDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  // Optimized: Use SQL aggregation instead of loading all records
  const [clientStats, projectStats, ticketStats, userStats] = await Promise.all(
    [
      // Client stats with SQL aggregation
      db
        .select({
          total: count(),
          active:
            sql<number>`count(*) filter (where ${clients.status} = 'active')`.as(
              "active"
            ),
          inactive:
            sql<number>`count(*) filter (where ${clients.status} = 'inactive')`.as(
              "inactive"
            ),
        })
        .from(clients)
        .where(isNull(clients.deletedAt))
        .then((rows) => rows[0]),

      // Project stats with SQL aggregation
      db
        .select({
          total: count(),
          active:
            sql<number>`count(*) filter (where ${projects.status} in ('in_progress', 'planning', 'review'))`.as(
              "active"
            ),
          completed:
            sql<number>`count(*) filter (where ${projects.status} = 'completed')`.as(
              "completed"
            ),
          overdue:
            sql<number>`count(*) filter (where ${projects.dueDate} < now() and ${projects.status} != 'completed')`.as(
              "overdue"
            ),
        })
        .from(projects)
        .where(isNull(projects.deletedAt))
        .then((rows) => rows[0]),

      // Ticket stats with SQL aggregation
      db
        .select({
          total: count(),
          open: sql<number>`count(*) filter (where ${tickets.status} = 'open')`.as(
            "open"
          ),
          inProgress:
            sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')`.as(
              "in_progress"
            ),
          urgent:
            sql<number>`count(*) filter (where ${tickets.priority} = 'urgent' and ${tickets.status} in ('open', 'in_progress'))`.as(
              "urgent"
            ),
          unassigned:
            sql<number>`count(*) filter (where ${tickets.assignedTo} is null and ${tickets.status} in ('open', 'in_progress'))`.as(
              "unassigned"
            ),
        })
        .from(tickets)
        .where(isNull(tickets.deletedAt))
        .then((rows) => rows[0]),

      // User stats with SQL aggregation
      db
        .select({
          total: count(),
          admins:
            sql<number>`count(*) filter (where ${users.role} = 'admin')`.as(
              "admins"
            ),
          clients:
            sql<number>`count(*) filter (where ${users.role} = 'client')`.as(
              "clients"
            ),
        })
        .from(users)
        .where(isNull(users.deletedAt))
        .then((rows) => rows[0]),
    ]
  );

  const stats = {
    clients: {
      total: clientStats.total,
      active: Number(clientStats.active),
      inactive: Number(clientStats.inactive),
    },
    projects: {
      total: projectStats.total,
      active: Number(projectStats.active),
      completed: Number(projectStats.completed),
      overdue: Number(projectStats.overdue),
    },
    tickets: {
      total: ticketStats.total,
      open: Number(ticketStats.open),
      inProgress: Number(ticketStats.inProgress),
      urgent: Number(ticketStats.urgent),
      unassigned: Number(ticketStats.unassigned),
    },
    users: {
      total: userStats.total,
      admins: Number(userStats.admins),
      clients: Number(userStats.clients),
    },
  };

  // Get recent activity with client names
  const [recentTicketsData, activeProjectsData] = await Promise.all([
    // Recent 5 tickets with client names
    db
      .select({
        id: tickets.id,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        clientId: tickets.clientId,
        createdAt: tickets.createdAt,
        clientName: clients.companyName,
      })
      .from(tickets)
      .leftJoin(clients, eq(tickets.clientId, clients.id))
      .where(isNull(tickets.deletedAt))
      .orderBy(desc(tickets.createdAt))
      .limit(5),

    // Active 5 projects with client names
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        dueDate: projects.dueDate,
        clientId: projects.clientId,
        createdAt: projects.createdAt,
        clientName: clients.companyName,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          isNull(projects.deletedAt),
          or(eq(projects.status, "in_progress"), eq(projects.status, "review"))
        )
      )
      .orderBy(desc(projects.createdAt))
      .limit(5),
  ]);

  const enrichedTickets = recentTicketsData.map((ticket) => ({
    ...ticket,
    clientName: ticket.clientName || "Unknown",
  }));

  const enrichedProjects = activeProjectsData.map((project) => ({
    ...project,
    clientName: project.clientName || "Unknown",
  }));

  const needsAttention = stats.tickets.urgent + stats.projects.overdue;

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutDashboard className="w-4 h-4 text-violet-500" />
              <span className="text-label text-violet-600">Admin</span>
            </div>
            <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
              Dashboard
            </h1>
            <p className="text-slate-500 max-w-lg">
              Complete overview of clients, projects, and support operations.
            </p>
          </div>
          <InviteTeamMemberDialog />
        </header>

        {/* Alert Bar */}
        {needsAttention > 0 && (
          <div className="mb-8 animate-fade-in-up opacity-0 stagger-2">
            <div className="card-elevated bg-gradient-to-r from-red-50 to-orange-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-heading text-base text-slate-900">
                    {needsAttention}{" "}
                    {needsAttention === 1 ? "item needs" : "items need"}{" "}
                    attention
                  </h3>
                  <p className="text-sm text-slate-600">
                    {stats.tickets.urgent > 0 &&
                      `${stats.tickets.urgent} urgent ticket${stats.tickets.urgent > 1 ? "s" : ""}`}
                    {stats.tickets.urgent > 0 &&
                      stats.projects.overdue > 0 &&
                      " · "}
                    {stats.projects.overdue > 0 &&
                      `${stats.projects.overdue} overdue project${stats.projects.overdue > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/admin/tickets" className="btn-primary">
                Review Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Link
            href="/dashboard/admin/clients"
            className="stat-card group animate-fade-in-up opacity-0 stagger-2 hover:shadow-lg hover:shadow-violet-500/5 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="stat-value">{stats.clients.total}</div>
            <div className="stat-label">Clients</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-emerald-600 font-medium">
                {stats.clients.active} active
              </span>
              {stats.clients.inactive > 0 && (
                <span className="text-slate-400">
                  {stats.clients.inactive} inactive
                </span>
              )}
            </div>
          </Link>

          <Link
            href="/dashboard/admin/projects"
            className="stat-card group animate-fade-in-up opacity-0 stagger-2 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FolderKanban className="w-5 h-5 text-blue-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="stat-value">{stats.projects.total}</div>
            <div className="stat-label">Projects</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-blue-600 font-medium">
                {stats.projects.active} active
              </span>
              {stats.projects.overdue > 0 && (
                <span className="text-red-600 font-medium">
                  {stats.projects.overdue} overdue
                </span>
              )}
            </div>
          </Link>

          <Link
            href="/dashboard/admin/tickets"
            className="stat-card group animate-fade-in-up opacity-0 stagger-3 hover:shadow-lg hover:shadow-amber-500/5 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5 text-amber-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="stat-value">
              {stats.tickets.open + stats.tickets.inProgress}
            </div>
            <div className="stat-label">Active Tickets</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              {stats.tickets.urgent > 0 ? (
                <span className="text-red-600 font-medium">
                  {stats.tickets.urgent} urgent
                </span>
              ) : stats.tickets.unassigned > 0 ? (
                <span className="text-orange-600 font-medium">
                  {stats.tickets.unassigned} unassigned
                </span>
              ) : (
                <span className="text-slate-400">All on track</span>
              )}
            </div>
          </Link>

          <div className="stat-card animate-fade-in-up opacity-0 stagger-3">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div className="stat-value">{stats.users.total}</div>
            <div className="stat-label">Portal Users</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-slate-600">{stats.users.admins} team</span>
              <span className="text-slate-400">
                {stats.users.clients} clients
              </span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Recent Tickets */}
          <div className="animate-fade-in-up opacity-0 stagger-4">
            <div className="card-elevated overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-500" />
                  <h2 className="text-heading text-sm text-slate-900">
                    Recent Tickets
                  </h2>
                </div>
                <Link
                  href="/dashboard/admin/tickets"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {enrichedTickets.length === 0 ? (
                  <div className="p-10 text-center">
                    <Ticket className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No recent tickets</p>
                  </div>
                ) : (
                  enrichedTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/admin/tickets/${ticket.id}`}
                      className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/50 transition-colors group"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          ticket.priority === "urgent"
                            ? "bg-red-500"
                            : ticket.priority === "high"
                              ? "bg-orange-500"
                              : ticket.priority === "medium"
                                ? "bg-blue-500"
                                : "bg-slate-300"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                          {ticket.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ticket.clientName} ·{" "}
                          {formatDistanceToNow(new Date(ticket.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-1 rounded ${
                          ticket.status === "open"
                            ? "bg-amber-50 text-amber-700"
                            : ticket.status === "in_progress"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Active Projects */}
          <div className="animate-fade-in-up opacity-0 stagger-4">
            <div className="card-elevated overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-500" />
                  <h2 className="text-heading text-sm text-slate-900">
                    Active Projects
                  </h2>
                </div>
                <Link
                  href="/dashboard/admin/projects"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {enrichedProjects.length === 0 ? (
                  <div className="p-10 text-center">
                    <FolderKanban className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No active projects</p>
                  </div>
                ) : (
                  enrichedProjects.map((project) => {
                    const isOverdue =
                      project.dueDate && new Date(project.dueDate) < new Date();
                    return (
                      <Link
                        key={project.id}
                        href={`/dashboard/admin/projects/${project.id}`}
                        className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {project.clientName}
                            {project.dueDate && (
                              <>
                                {" "}
                                ·{" "}
                                <span
                                  className={
                                    isOverdue
                                      ? "text-red-600 font-medium"
                                      : ""
                                  }
                                >
                                  Due{" "}
                                  {formatDistanceToNow(
                                    new Date(project.dueDate),
                                    { addSuffix: true }
                                  )}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap ${
                            project.status === "in_progress"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {project.status.replace("_", " ")}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 animate-fade-in-up opacity-0 stagger-5">
          <Link
            href="/dashboard/admin/clients"
            className="card-interactive p-5 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-heading text-base text-slate-900 mb-1">
              Manage Clients
            </h3>
            <p className="text-sm text-slate-500">
              View all clients and their projects
            </p>
          </Link>

          <Link
            href="/dashboard/admin/projects"
            className="card-interactive p-5 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-heading text-base text-slate-900 mb-1">
              Projects Board
            </h3>
            <p className="text-sm text-slate-500">
              Track project progress and status
            </p>
          </Link>

          <Link
            href="/dashboard/admin/tickets"
            className="card-interactive p-5 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-heading text-base text-slate-900 mb-1">
              Support Queue
            </h3>
            <p className="text-sm text-slate-500">
              Manage tickets by priority
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
