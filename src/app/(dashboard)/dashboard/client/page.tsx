import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, messages, clients, tickets, integrationMonitors, projectPhases } from "@/lib/db/schema";
import { eq, isNull, and, desc, count, sql, gte, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  FolderOpen,
  MessageSquare,
  Clock,
  Activity,
  Zap,
  TrendingUp,
  Layout,
  CheckCircle,
  AlertCircle,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn, formatMinutesToHours } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const user = await requireAuth();

  // Get client info
  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, user.clientId!), isNull(clients.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] || null);

  if (!client) return null;

  // Fetch projects
  const clientProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, client.id), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));

  // Fetch ticket stats
  const openTicketsCount = await db
    .select({ count: count() })
    .from(tickets)
    .where(and(eq(tickets.clientId, client.id), isNull(tickets.deletedAt), eq(tickets.status, 'open')))
    .then(r => r[0]?.count || 0);

  const activeProjectsCount = clientProjects.filter(p => !['completed', 'on_hold'].includes(p.status)).length;
  const integrationsCount = await db
    .select({ count: count() })
    .from(integrationMonitors)
    .where(and(eq(integrationMonitors.clientId, client.id), isNull(integrationMonitors.deletedAt)))
    .then(r => r[0]?.count || 0);

  // Calculate date ranges
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Project velocity: Calculate % of completed phases per month
  const projectIds = clientProjects.map(p => p.id);

  let activityData = [
    { label: "OCT", value: 30 },
    { label: "NOV", value: 45 },
    { label: "DEC", value: 75 },
  ];

  if (projectIds.length > 0) {
    const phaseCompletion = await db
      .select({
        month: sql<string>`TO_CHAR(${projectPhases.completedAt}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${projectPhases.completedAt})`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${projectPhases.status} = 'completed')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(projectPhases)
      .where(
        and(
          inArray(projectPhases.projectId, projectIds),
          gte(projectPhases.createdAt, threeMonthsAgo)
        )
      )
      .groupBy(sql`TO_CHAR(${projectPhases.completedAt}, 'Mon')`, sql`EXTRACT(MONTH FROM ${projectPhases.completedAt})`);

    // Fill in months with real data or defaults
    const monthNames = ['OCT', 'NOV', 'DEC'];
    const currentMonth = now.getMonth();

    activityData = monthNames.map((monthName, index) => {
      const targetMonth = currentMonth - 2 + index;
      const normalizedMonth = ((targetMonth % 12) + 12) % 12 + 1;

      const existing = phaseCompletion.find(m => Number(m.monthNum) === normalizedMonth);
      const percentage = existing && Number(existing.total) > 0
        ? Math.round((Number(existing.completed) / Number(existing.total)) * 100)
        : Math.max(30, index * 20); // Default fallback pattern

      return {
        label: monthName,
        value: Math.min(percentage, 100),
      };
    });
  }

  // Support hours calculations
  const remainingMinutes = (client.supportHoursPerMonth || 0) - (client.hoursUsedThisMonth || 0);

  // Recent activity items (messages or ticket updates)
  const recentMessages = await db
    .select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      projectName: projects.name,
    })
    .from(messages)
    .leftJoin(projects, eq(messages.projectId, projects.id))
    .where(
      and(
        isNull(messages.deletedAt),
        projectIds.length > 0 ? inArray(messages.projectId, projectIds) : sql`false`
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(3);

  // Pending action items (open tickets + unread messages)
  const pendingTickets = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      createdAt: tickets.createdAt,
      priority: tickets.priority,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.clientId, client.id),
        isNull(tickets.deletedAt),
        inArray(tickets.status, ['open', 'waiting_on_client'])
      )
    )
    .orderBy(desc(tickets.createdAt))
    .limit(2);

  const unreadMessagesCount = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        projectIds.length > 0 ? inArray(messages.projectId, projectIds) : sql`false`,
        eq(messages.read, false),
        isNull(messages.deletedAt)
      )
    )
    .then(r => r[0]?.count || 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {client.contactName.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-xl font-semibold text-gray-500">
            <Clock className="w-3.5 h-3.5 mr-2" />
            Last 30 Days
          </Button>
          <Link href="/dashboard/client/tickets/new">
            <Button size="sm" className="rounded-xl font-semibold shadow-sm">
              <Layout className="w-3.5 h-3.5 mr-2" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter delay-200">
        <StatCard
          label="Active Projects"
          value={activeProjectsCount.toString()}
          trend="12.5%"
          trendUp={true}
          icon={<FolderOpen className="w-4 h-4 text-[#06B6D4]" />}
          variant="cyan"
        />
        <StatCard
          label="Pending Tickets"
          value={openTicketsCount.toString()}
          trend="Low Volume"
          trendUp={true} // Green because low volume is good? or false? text is gray usually
          icon={<MessageSquare className="w-4 h-4 text-[#6366F1]" />}
          variant="indigo"
        />
        <StatCard
          label="System Health"
          value={`${integrationsCount} Active`}
          trend="100% Uptime"
          trendUp={true}
          icon={<Activity className="w-4 h-4 text-emerald-500" />}
          variant="emerald"
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Chart / Activity Area (Col 8) */}
        <div className="col-span-12 lg:col-span-8 space-y-8 animate-enter delay-300">
          {/* Activity / Progress Chart Mimic */}
          <Card className="p-8 rounded-xl border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project Velocity</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">On Track</h2>
              </div>
              <div className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                Q4 2025
              </div>
            </div>

            {/* Mock Chart Bars */}
            <div className="flex items-end justify-around h-[200px] px-8 pb-4 relative">
              {/* Dotted lines background */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full border-t border-dashed border-gray-400"></div>
                <div className="w-full border-t border-dashed border-gray-400"></div>
                <div className="w-full border-t border-dashed border-gray-400"></div>
                <div className="w-full border-t border-dashed border-gray-400"></div>
              </div>

              {activityData.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-4 relative z-10 w-12 group">
                  <div className="w-full bg-[#E0E7FF] rounded-full relative overflow-hidden flex items-end opacity-50 hover:opacity-100 transition-opacity" style={{ height: '180px' }}>
                    <div className="w-full bg-[#6366F1] rounded-t-full transition-all duration-1000" style={{ height: `${d.value}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.label}</span>
                  {i === 2 && (
                    <div className="absolute -top-10 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-bounce">
                      Now
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Priority Projects Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Projects</span>
              </div>
              <Link href="/dashboard/client/projects" className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">View All</Link>
            </div>
            <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/30 text-left">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-8">Project Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right pr-8">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clientProjects.slice(0, 3).map((project) => (
                      <tr key={project.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 pl-8 font-medium text-sm text-gray-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {project.name.charAt(0)}
                          </div>
                          {project.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                            project.status === 'in_progress' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                              project.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                "bg-gray-50 text-gray-500 border-gray-100"
                          )}>
                            {project.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500">
                          {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBD'}
                        </td>
                        <td className="px-6 py-4 text-right pr-8">
                          <Link href={`/dashboard/client/projects/${project.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Sidebar (Col 4) */}
        <div className="col-span-12 lg:col-span-4 space-y-8 animate-enter delay-400">
          {/* Time Tracker / Hours Concept */}
          <Card className="rounded-xl border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Support Hours</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{formatMinutesToHours(remainingMinutes)}</h2>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", remainingMinutes > 0 ? "text-emerald-500" : "text-orange-500")}>
                  {remainingMinutes > 0 ? 'Available this month' : 'Hours depleted'}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="space-y-4">
              {recentMessages.length > 0 ? recentMessages.map((msg) => (
                <Link key={msg.id} href={`/dashboard/client/messages`}>
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{msg.projectName || 'Message'}</p>
                      <p className="text-[10px] text-gray-400 font-medium truncate">{msg.content.substring(0, 30)}...</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 group-hover:text-indigo-400">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                  </div>
                </Link>
              )) : (
                <div className="text-center text-gray-400 text-xs py-4">No recent activity</div>
              )}
            </div>
          </Card>

          {/* Notifications / Pending Items */}
          <Card className="rounded-xl border-gray-100 shadow-sm p-6 bg-[#111827] text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold">Action Required</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  {pendingTickets.length + Number(unreadMessagesCount)} Pending Items
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {pendingTickets.length > 0 ? pendingTickets.map((ticket) => (
                <Link key={ticket.id} href={`/dashboard/client/tickets/${ticket.id}`}>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                    <p className="text-xs font-bold mb-1">{ticket.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {ticket.status === 'waiting_on_client' ? 'Awaiting your response' : 'Open ticket'} • {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              )) : (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-xs text-gray-400">No pending items</p>
                </div>
              )}
            </div>
            <Link href="/dashboard/client/tickets">
              <Button className="w-full mt-6 font-semibold rounded-xl text-sm">
                View All Tickets
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
