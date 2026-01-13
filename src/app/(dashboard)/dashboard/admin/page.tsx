import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, tickets, users } from "@/lib/db/schema";
import { isNull, eq, and, sql, desc, or } from "drizzle-orm";
import { Users, Activity, Ticket, TrendingUp, AlertTriangle, CheckCircle, Clock, Building2, FolderKanban, Zap, ArrowRight, ExternalLink } from "lucide-react";
import { InviteTeamMemberDialog } from "@/components/invite-team-member-dialog";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  // Fetch all data in parallel
  const [allClients, allProjects, allTickets, allUsers] = await Promise.all([
    db.select().from(clients).where(isNull(clients.deletedAt)),
    db.select().from(projects).where(isNull(projects.deletedAt)),
    db.select().from(tickets).where(isNull(tickets.deletedAt)),
    db.select().from(users).where(isNull(users.deletedAt)),
  ]);

  // Calculate comprehensive stats
  const stats = {
    clients: {
      total: allClients.length,
      active: allClients.filter(c => c.status === "active").length,
      inactive: allClients.filter(c => c.status === "inactive").length,
    },
    projects: {
      total: allProjects.length,
      active: allProjects.filter(p => ["in_progress", "planning", "review"].includes(p.status)).length,
      completed: allProjects.filter(p => p.status === "completed").length,
      overdue: allProjects.filter(p => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "completed").length,
    },
    tickets: {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === "open").length,
      inProgress: allTickets.filter(t => t.status === "in_progress").length,
      urgent: allTickets.filter(t => t.priority === "urgent" && ["open", "in_progress"].includes(t.status)).length,
      unassigned: allTickets.filter(t => !t.assignedTo && ["open", "in_progress"].includes(t.status)).length,
    },
    users: {
      total: allUsers.length,
      admins: allUsers.filter(u => u.role === "admin").length,
      clients: allUsers.filter(u => u.role === "client").length,
    },
  };

  // Get recent activity - tickets and projects
  const recentTickets = allTickets
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const activeProjects = allProjects
    .filter(p => ["in_progress", "review"].includes(p.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Get client names for tickets and projects
  const clientMap = new Map(allClients.map(c => [c.id, c.companyName]));

  // Enrich tickets with client names
  const enrichedTickets = recentTickets.map(ticket => ({
    ...ticket,
    clientName: clientMap.get(ticket.clientId) || "Unknown",
  }));

  // Enrich projects with client names
  const enrichedProjects = activeProjects.map(project => ({
    ...project,
    clientName: clientMap.get(project.clientId) || "Unknown",
  }));

  // Get urgent items that need attention
  const urgentTickets = allTickets.filter(t =>
    t.priority === "urgent" && ["open", "in_progress"].includes(t.status)
  );

  const overdueProjects = allProjects.filter(p =>
    p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "completed"
  );

  const needsAttention = [...urgentTickets, ...overdueProjects].length;

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2">
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
                    {urgentTickets.length > 0 && `${urgentTickets.length} urgent ticket${urgentTickets.length > 1 ? "s" : ""}`}
                    {urgentTickets.length > 0 && overdueProjects.length > 0 && " • "}
                    {overdueProjects.length > 0 && `${overdueProjects.length} overdue project${overdueProjects.length > 1 ? "s" : ""}`}
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
