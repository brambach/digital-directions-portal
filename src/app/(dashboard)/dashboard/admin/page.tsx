import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, tickets, integrationMonitors } from "@/lib/db/schema";
import { isNull, eq, and, sql, desc, count, or, lt } from "drizzle-orm";
import {
  Users,
  Ticket,
  Briefcase,
  Activity,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Building2,
  Zap,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  // Get basic stats with safe defaults
  let clientStats = { total: 0, active: 0 };
  let projectStats = { total: 0, active: 0 };
  let ticketStats = { total: 0, open: 0, urgent: 0 };

  try {
    const [cs, ps, ts] = await Promise.all([
      db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${clients.status} = 'active')`,
        })
        .from(clients)
        .where(isNull(clients.deletedAt)),
      db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${projects.status} in ('in_progress', 'planning', 'review'))`,
        })
        .from(projects)
        .where(isNull(projects.deletedAt)),
      db
        .select({
          total: count(),
          open: sql<number>`count(*) filter (where ${tickets.status} = 'open')`,
          urgent: sql<number>`count(*) filter (where ${tickets.priority} = 'urgent' and ${tickets.status} in ('open', 'in_progress'))`,
        })
        .from(tickets)
        .where(isNull(tickets.deletedAt)),
    ]);

    if (cs?.[0]) clientStats = { total: Number(cs[0].total) || 0, active: Number(cs[0].active) || 0 };
    if (ps?.[0]) projectStats = { total: Number(ps[0].total) || 0, active: Number(ps[0].active) || 0 };
    if (ts?.[0]) ticketStats = { total: Number(ts[0].total) || 0, open: Number(ts[0].open) || 0, urgent: Number(ts[0].urgent) || 0 };
  } catch (e) {
    console.error("Error fetching stats:", e);
  }

  // Get project status distribution
  let projectsByStatus: { planning: number; in_progress: number; review: number; completed: number; on_hold: number } = {
    planning: 0,
    in_progress: 0,
    review: 0,
    completed: 0,
    on_hold: 0,
  };

  try {
    const statusData = await db
      .select({
        status: projects.status,
        count: count(),
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .groupBy(projects.status);

    statusData?.forEach((item) => {
      if (item?.status && item.status in projectsByStatus) {
        projectsByStatus[item.status as keyof typeof projectsByStatus] = Number(item.count) || 0;
      }
    });
  } catch (e) {
    console.error("Error fetching project status:", e);
  }

  const totalProjects = projectsByStatus.planning + projectsByStatus.in_progress + projectsByStatus.review + projectsByStatus.completed + projectsByStatus.on_hold;

  // Get integration health
  let integrationHealth = { healthy: 0, degraded: 0, down: 0 };

  try {
    const healthData = await db
      .select({
        status: integrationMonitors.currentStatus,
        count: count(),
      })
      .from(integrationMonitors)
      .where(eq(integrationMonitors.isEnabled, true))
      .groupBy(integrationMonitors.currentStatus);

    healthData?.forEach((item) => {
      if (item?.status === "healthy") integrationHealth.healthy = Number(item.count) || 0;
      if (item?.status === "degraded") integrationHealth.degraded = Number(item.count) || 0;
      if (item?.status === "down") integrationHealth.down = Number(item.count) || 0;
    });
  } catch (e) {
    console.error("Error fetching integration health:", e);
  }

  const totalIntegrations = integrationHealth.healthy + integrationHealth.degraded + integrationHealth.down;

  // Get recent tickets
  let recentTickets: Array<{ id: string; title: string; status: string; priority: string; createdAt: Date; clientName: string | null }> = [];

  // Get urgent/high priority tickets for action required section
  let urgentTickets: Array<{ id: string; title: string; status: string; priority: string; createdAt: Date; clientName: string | null }> = [];

  // Get clients needing attention (support hours low, inactive, etc.)
  let clientsNeedingAttention: Array<{
    id: string;
    companyName: string;
    status: string;
    supportHoursPerMonth: number | null;
    hoursUsedThisMonth: number | null;
    reason: string;
  }> = [];

  try {
    const [ticketsData, urgentData, attentionClients] = await Promise.all([
      db
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
          clientName: clients.companyName,
        })
        .from(tickets)
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .where(isNull(tickets.deletedAt))
        .orderBy(desc(tickets.createdAt))
        .limit(5),
      db
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
          clientName: clients.companyName,
        })
        .from(tickets)
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .where(
          and(
            isNull(tickets.deletedAt),
            sql`${tickets.status} in ('open', 'in_progress')`,
            sql`${tickets.priority} in ('urgent', 'high')`
          )
        )
        .orderBy(desc(tickets.createdAt))
        .limit(3),
      // Clients with support hours >80% used OR inactive status
      db
        .select({
          id: clients.id,
          companyName: clients.companyName,
          status: clients.status,
          supportHoursPerMonth: clients.supportHoursPerMonth,
          hoursUsedThisMonth: clients.hoursUsedThisMonth,
        })
        .from(clients)
        .where(
          and(
            isNull(clients.deletedAt),
            or(
              // Support hours > 80% used (and has support hours allocated)
              sql`${clients.supportHoursPerMonth} > 0 AND ${clients.hoursUsedThisMonth} >= ${clients.supportHoursPerMonth} * 0.8`,
              // Inactive clients
              eq(clients.status, 'inactive')
            )
          )
        )
        .limit(3),
    ]);

    recentTickets = ticketsData || [];
    urgentTickets = urgentData || [];

    // Add reason to each client
    clientsNeedingAttention = (attentionClients || []).map(c => {
      let reason = '';
      const supportHours = c.supportHoursPerMonth || 0;
      const usedHours = c.hoursUsedThisMonth || 0;
      const hoursUsedPercent = supportHours > 0
        ? Math.round((usedHours / supportHours) * 100)
        : 0;

      if (c.status === 'inactive') {
        reason = 'Inactive account';
      } else if (hoursUsedPercent >= 100) {
        reason = 'Support hours depleted';
      } else if (hoursUsedPercent >= 80) {
        reason = `${hoursUsedPercent}% hours used`;
      }

      return { ...c, reason };
    });
  } catch (e) {
    console.error("Error fetching recent data:", e);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Manage clients, projects, and support tickets</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/tickets">
            <Button size="sm" className="rounded-xl font-semibold shadow-sm">
              <Ticket className="w-3.5 h-3.5 mr-2" />
              View Tickets
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter delay-200">
        <StatCard
          label="Total Clients"
          value={clientStats.total.toString()}
          icon={<Users className="w-4 h-4 text-violet-600" />}
          period={`${clientStats.active} active`}
          variant="violet"
        />
        <StatCard
          label="Active Projects"
          value={projectStats.active.toString()}
          icon={<Briefcase className="w-4 h-4 text-cyan-600" />}
          period={`${projectStats.total} total`}
          variant="cyan"
        />
        <StatCard
          label="Open Tickets"
          value={ticketStats.open.toString()}
          icon={<Ticket className="w-4 h-4 text-indigo-600" />}
          period={ticketStats.urgent > 0 ? `${ticketStats.urgent} urgent` : "All clear"}
          variant="indigo"
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Chart / Activity Area (Col 8) */}
        <div className="col-span-12 lg:col-span-8 space-y-8 animate-enter delay-300">
          {/* Project Status Distribution */}
          <Card className="p-8 rounded-xl border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project Status</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{totalProjects} Projects</h2>
              </div>
              <Link href="/dashboard/admin/projects" className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">
                View All
              </Link>
            </div>

            {/* Status Chart */}
            <div className="flex items-end justify-around h-[200px] px-8 pb-4 relative">
              {/* Dotted lines background */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full border-t border-dashed border-gray-400"></div>
                <div className="w-full border-t border-dashed border-gray-400"></div>
                <div className="w-full border-t border-dashed border-gray-400"></div>
                <div className="w-full border-t border-dashed border-gray-400"></div>
              </div>

              {totalProjects === 0 ? (
                <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                  No projects yet
                </div>
              ) : (
                <>
                  <StatusBar label="Planning" count={projectsByStatus.planning} total={totalProjects} color="bg-gray-400" />
                  <StatusBar label="In Progress" count={projectsByStatus.in_progress} total={totalProjects} color="bg-[#6366F1]" />
                  <StatusBar label="Review" count={projectsByStatus.review} total={totalProjects} color="bg-amber-500" />
                  <StatusBar label="Completed" count={projectsByStatus.completed} total={totalProjects} color="bg-emerald-500" />
                  <StatusBar label="On Hold" count={projectsByStatus.on_hold} total={totalProjects} color="bg-red-400" />
                </>
              )}
            </div>
          </Card>

          {/* Recent Tickets Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Tickets</span>
              </div>
              <Link href="/dashboard/admin/tickets" className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">View All</Link>
            </div>
            <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/30 text-left">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-8">Ticket</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right pr-8">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentTickets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">No tickets yet</td>
                      </tr>
                    ) : (
                      recentTickets.map((ticket) => (
                        <tr key={ticket.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 pl-8 font-medium text-sm text-gray-900 flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                              ticket.priority === "urgent" ? "bg-red-50 text-red-600" :
                              ticket.priority === "high" ? "bg-orange-50 text-orange-600" :
                              "bg-indigo-50 text-indigo-600"
                            )}>
                              <Ticket className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="truncate block max-w-[200px]">{ticket.title}</span>
                              <span className="text-[10px] text-gray-400">{ticket.clientName || "Unknown"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                              ticket.status === "open" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              ticket.status === "in_progress" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                              "bg-gray-50 text-gray-500 border-gray-100"
                            )}>
                              {ticket.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                              ticket.priority === "urgent" ? "bg-red-50 text-red-600 border-red-100" :
                              ticket.priority === "high" ? "bg-orange-50 text-orange-600 border-orange-100" :
                              ticket.priority === "medium" ? "bg-blue-50 text-blue-600 border-blue-100" :
                              "bg-gray-50 text-gray-500 border-gray-100"
                            )}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right pr-8">
                            <Link href={`/dashboard/admin/tickets/${ticket.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Sidebar (Col 4) */}
        <div className="col-span-12 lg:col-span-4 space-y-8 animate-enter delay-400">
          {/* Client Health - Matching client dashboard Support Hours card exactly */}
          <Card className="rounded-xl border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Health</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{clientStats.active} Active</h2>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-1",
                  clientsNeedingAttention.length > 0 ? "text-orange-500" : "text-emerald-500"
                )}>
                  {clientsNeedingAttention.length > 0
                    ? `${clientsNeedingAttention.length} need${clientsNeedingAttention.length === 1 ? 's' : ''} attention`
                    : 'All clients healthy'}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="space-y-4">
              {clientsNeedingAttention.length > 0 ? clientsNeedingAttention.map((client) => (
                <Link key={client.id} href={`/dashboard/admin/clients/${client.id}`}>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      client.reason.includes('depleted') ? "bg-red-50 text-red-500 group-hover:bg-red-100" :
                      client.reason.includes('Inactive') ? "bg-gray-100 text-gray-400 group-hover:bg-gray-200" :
                      "bg-orange-50 text-orange-500 group-hover:bg-orange-100"
                    )}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{client.companyName}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{client.reason}</p>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="text-center text-gray-400 text-xs py-4">All clients are healthy</div>
              )}
            </div>
          </Card>

          {/* Action Required - Dark Card */}
          <Card className="rounded-xl border-gray-100 shadow-sm p-6 bg-[#111827] text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold">Action Required</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  {urgentTickets.length} High Priority {urgentTickets.length === 1 ? 'Ticket' : 'Tickets'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {urgentTickets.length > 0 ? urgentTickets.map((ticket) => (
                <Link key={ticket.id} href={`/dashboard/admin/tickets/${ticket.id}`}>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                    <p className="text-xs font-bold mb-1 truncate">{ticket.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {ticket.clientName} • {ticket.priority} priority • {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              )) : (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No urgent tickets!</p>
                </div>
              )}
            </div>
            <Link href="/dashboard/admin/tickets">
              <Button className="w-full mt-6 font-semibold rounded-xl text-sm">
                View All Tickets
              </Button>
            </Link>
          </Card>

          {/* Integration Status - Compact */}
          {totalIntegrations > 0 && (
            <Card className="rounded-xl border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  integrationHealth.down > 0 ? "bg-red-50" :
                  integrationHealth.degraded > 0 ? "bg-amber-50" :
                  "bg-emerald-50"
                )}>
                  <Zap className={cn(
                    "w-4 h-4",
                    integrationHealth.down > 0 ? "text-red-500" :
                    integrationHealth.degraded > 0 ? "text-amber-500" :
                    "text-emerald-500"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900">{totalIntegrations} Integrations</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    integrationHealth.down > 0 ? "text-red-500" :
                    integrationHealth.degraded > 0 ? "text-amber-500" :
                    "text-emerald-500"
                  )}>
                    {integrationHealth.down > 0 ? `${integrationHealth.down} down` :
                     integrationHealth.degraded > 0 ? `${integrationHealth.degraded} degraded` :
                     "All operational"}
                  </p>
                </div>
                <div className="flex gap-1">
                  {integrationHealth.healthy > 0 && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" title={`${integrationHealth.healthy} healthy`} />
                  )}
                  {integrationHealth.degraded > 0 && (
                    <div className="w-2 h-2 rounded-full bg-amber-500" title={`${integrationHealth.degraded} degraded`} />
                  )}
                  {integrationHealth.down > 0 && (
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title={`${integrationHealth.down} down`} />
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Component - Status Bar for chart
function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.max((count / total) * 100, count > 0 ? 10 : 0) : 0;
  return (
    <div className="flex flex-col items-center gap-4 relative z-10 w-12 group">
      <div className="w-full bg-[#E0E7FF] rounded-full relative overflow-hidden flex items-end opacity-50 hover:opacity-100 transition-opacity" style={{ height: '180px' }}>
        <div className={cn("w-full rounded-t-full transition-all duration-1000", color)} style={{ height: `${percentage}%` }}></div>
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label.split(' ')[0]}</span>
    </div>
  );
}
