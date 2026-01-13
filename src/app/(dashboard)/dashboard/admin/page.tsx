import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, tickets, users } from "@/lib/db/schema";
import { isNull, eq, and, sql, desc, or, count } from "drizzle-orm";
import { Users, Activity, Ticket, TrendingUp, AlertTriangle, CheckCircle, Clock, Building2, FolderKanban, Zap, ArrowRight, ExternalLink, LayoutDashboard } from "lucide-react";
import { InviteTeamMemberDialog } from "@/components/invite-team-member-dialog";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  // Optimized: Use SQL aggregation instead of loading all records
  const [clientStats, projectStats, ticketStats, userStats] = await Promise.all([
    // Client stats with SQL aggregation
    db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${clients.status} = 'active')`.as('active'),
        inactive: sql<number>`count(*) filter (where ${clients.status} = 'inactive')`.as('inactive'),
      })
      .from(clients)
      .where(isNull(clients.deletedAt))
      .then(rows => rows[0]),

    // Project stats with SQL aggregation
    db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${projects.status} in ('in_progress', 'planning', 'review'))`.as('active'),
        completed: sql<number>`count(*) filter (where ${projects.status} = 'completed')`.as('completed'),
        overdue: sql<number>`count(*) filter (where ${projects.dueDate} < now() and ${projects.status} != 'completed')`.as('overdue'),
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .then(rows => rows[0]),

    // Ticket stats with SQL aggregation
    db
      .select({
        total: count(),
        open: sql<number>`count(*) filter (where ${tickets.status} = 'open')`.as('open'),
        inProgress: sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')`.as('in_progress'),
        urgent: sql<number>`count(*) filter (where ${tickets.priority} = 'urgent' and ${tickets.status} in ('open', 'in_progress'))`.as('urgent'),
        unassigned: sql<number>`count(*) filter (where ${tickets.assignedTo} is null and ${tickets.status} in ('open', 'in_progress'))`.as('unassigned'),
      })
      .from(tickets)
      .where(isNull(tickets.deletedAt))
      .then(rows => rows[0]),

    // User stats with SQL aggregation
    db
      .select({
        total: count(),
        admins: sql<number>`count(*) filter (where ${users.role} = 'admin')`.as('admins'),
        clients: sql<number>`count(*) filter (where ${users.role} = 'client')`.as('clients'),
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .then(rows => rows[0]),
  ]);

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

  // Get recent activity with client names (optimized - only fetch what's needed)
  const [recentTicketsData, activeProjectsData, urgentTicketsCount, overdueProjectsCount] = await Promise.all([
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
      .where(and(
        isNull(projects.deletedAt),
        or(eq(projects.status, "in_progress"), eq(projects.status, "review"))
      ))
      .orderBy(desc(projects.createdAt))
      .limit(5),

    // Count urgent tickets
    db
      .select({ count: count() })
      .from(tickets)
      .where(and(
        isNull(tickets.deletedAt),
        eq(tickets.priority, "urgent"),
        or(eq(tickets.status, "open"), eq(tickets.status, "in_progress"))
      ))
      .then(rows => rows[0]?.count || 0),

    // Count overdue projects
    db
      .select({ count: count() })
      .from(projects)
      .where(and(
        isNull(projects.deletedAt),
        sql`${projects.dueDate} < now()`,
        sql`${projects.status} != 'completed'`
      ))
      .then(rows => rows[0]?.count || 0),
  ]);

  const enrichedTickets = recentTicketsData.map(ticket => ({
    ...ticket,
    clientName: ticket.clientName || "Unknown",
  }));

  const enrichedProjects = activeProjectsData.map(project => ({
    ...project,
    clientName: project.clientName || "Unknown",
  }));

  const needsAttention = Number(urgentTicketsCount) + Number(overdueProjectsCount);

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <LayoutDashboard className="w-7 h-7 text-indigo-600" />
              Dashboard
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              Complete overview of clients, projects, and support operations.
            </p>
          </div>
          <InviteTeamMemberDialog />
        </div>

        {/* Alert Bar for Items Needing Attention */}
        {needsAttention > 0 && (
          <div className="mb-8 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-red-200 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {needsAttention} {needsAttention === 1 ? "item" : "items"} need immediate attention
                  </h3>
                  <p className="text-xs text-slate-600">
                    {stats.tickets.urgent > 0 && `${stats.tickets.urgent} urgent ticket${stats.tickets.urgent > 1 ? "s" : ""}`}
                    {stats.tickets.urgent > 0 && stats.projects.overdue > 0 && " • "}
                    {stats.projects.overdue > 0 && `${stats.projects.overdue} overdue project${stats.projects.overdue > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/admin/tickets"
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                Review Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Clients Stat */}
          <Link href="/dashboard/admin/clients" className="group">
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-3xl font-semibold text-slate-900 mb-1">{stats.clients.total}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Clients</div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-medium">{stats.clients.active} active</span>
                {stats.clients.inactive > 0 && (
                  <span className="text-slate-400">{stats.clients.inactive} inactive</span>
                )}
              </div>
            </div>
          </Link>

          {/* Projects Stat */}
          <Link href="/dashboard/admin/projects" className="group">
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-3xl font-semibold text-slate-900 mb-1">{stats.projects.total}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Projects</div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-blue-600 font-medium">{stats.projects.active} active</span>
                {stats.projects.overdue > 0 && (
                  <span className="text-red-600 font-medium">{stats.projects.overdue} overdue</span>
                )}
              </div>
            </div>
          </Link>

          {/* Tickets Stat */}
          <Link href="/dashboard/admin/tickets" className="group">
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.4s_both]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <Ticket className="w-5 h-5 text-amber-600" />
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-3xl font-semibold text-slate-900 mb-1">{stats.tickets.open + stats.tickets.inProgress}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Active Tickets</div>
              <div className="flex items-center gap-3 text-xs min-h-[20px]">
                {stats.tickets.urgent > 0 ? (
                  <span className="text-red-600 font-medium">{stats.tickets.urgent} urgent</span>
                ) : stats.tickets.unassigned > 0 ? (
                  <span className="text-orange-600 font-medium">{stats.tickets.unassigned} unassigned</span>
                ) : (
                  <span className="text-slate-400">All on track</span>
                )}
                {stats.tickets.urgent > 0 && stats.tickets.unassigned > 0 && (
                  <span className="text-orange-600 font-medium">{stats.tickets.unassigned} unassigned</span>
                )}
              </div>
            </div>
          </Link>

          {/* Users Stat */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{stats.users.total}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Portal Users</div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-600">{stats.users.admins} team</span>
              <span className="text-slate-400">{stats.users.clients} clients</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Tickets */}
          <div className="animate-on-scroll [animation:animationIn_0.5s_ease-out_0.6s_both]">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-slate-900">Recent Tickets</h2>
                </div>
                <Link href="/dashboard/admin/tickets" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                  View All →
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {enrichedTickets.length === 0 ? (
                  <div className="p-8 text-center">
                    <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-slate-400">No recent tickets</p>
                  </div>
                ) : (
                  enrichedTickets.map(ticket => (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/admin/tickets/${ticket.id}`}
                      className="block px-5 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          ticket.priority === "urgent" ? "bg-red-500" :
                          ticket.priority === "high" ? "bg-orange-500" :
                          ticket.priority === "medium" ? "bg-blue-500" :
                          "bg-slate-300"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {ticket.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{ticket.clientName}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          ticket.status === "open" ? "bg-amber-50 text-amber-600" :
                          ticket.status === "in_progress" ? "bg-indigo-50 text-indigo-600" :
                          "bg-emerald-50 text-emerald-600"
                        }`}>
                          {ticket.status.replace("_", " ")}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Active Projects */}
          <div className="animate-on-scroll [animation:animationIn_0.5s_ease-out_0.7s_both]">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">Active Projects</h2>
                </div>
                <Link href="/dashboard/admin/projects" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                  View All →
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {enrichedProjects.length === 0 ? (
                  <div className="p-8 text-center">
                    <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-slate-400">No active projects</p>
                  </div>
                ) : (
                  enrichedProjects.map(project => {
                    const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();
                    return (
                      <Link
                        key={project.id}
                        href={`/dashboard/admin/projects/${project.id}`}
                        className="block px-5 py-3 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">{project.clientName}</span>
                              {project.dueDate && (
                                <>
                                  <span className="text-xs text-slate-400">•</span>
                                  <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-slate-400"}`}>
                                    Due {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap ${
                            project.status === "in_progress" ? "bg-blue-50 text-blue-600" :
                            project.status === "review" ? "bg-purple-50 text-purple-600" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {project.status.replace("_", " ")}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.8s_both]">
          <Link
            href="/dashboard/admin/clients"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Manage Clients</h3>
            <p className="text-xs text-slate-600">View all clients and their projects</p>
          </Link>

          <Link
            href="/dashboard/admin/projects"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-blue-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Projects Board</h3>
            <p className="text-xs text-slate-600">Track project progress and status</p>
          </Link>

          <Link
            href="/dashboard/admin/tickets"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-amber-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Support Queue</h3>
            <p className="text-xs text-slate-600">Manage tickets by priority</p>
          </Link>
        </div>
      </div>
    </>
  );
}
