import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, tickets, integrationMonitors } from "@/lib/db/schema";
import { isNull, eq, and, sql, desc, count, or } from "drizzle-orm";
import {
  Users,
  Ticket,
  FolderKanban,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Filter,
  ArrowRightLeft,
  ChevronRight,
  Monitor,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  let clientStats = { total: 0, active: 0 };
  let projectStats = { total: 0, active: 0 };
  let ticketStats = { total: 0, open: 0, urgent: 0 };

  try {
    const [cs, ps, ts] = await Promise.all([
      db.select({ total: count(), active: sql<number>`count(*) filter (where ${clients.status} = 'active')` }).from(clients).where(isNull(clients.deletedAt)),
      db.select({ total: count(), active: sql<number>`count(*) filter (where ${projects.status} in ('in_progress', 'planning', 'review'))` }).from(projects).where(isNull(projects.deletedAt)),
      db.select({ total: count(), open: sql<number>`count(*) filter (where ${tickets.status} = 'open')`, urgent: sql<number>`count(*) filter (where ${tickets.priority} = 'urgent' and ${tickets.status} in ('open', 'in_progress'))` }).from(tickets).where(isNull(tickets.deletedAt)),
    ]);
    if (cs?.[0]) clientStats = { total: Number(cs[0].total) || 0, active: Number(cs[0].active) || 0 };
    if (ps?.[0]) projectStats = { total: Number(ps[0].total) || 0, active: Number(ps[0].active) || 0 };
    if (ts?.[0]) ticketStats = { total: Number(ts[0].total) || 0, open: Number(ts[0].open) || 0, urgent: Number(ts[0].urgent) || 0 };
  } catch (e) { console.error("Error fetching stats:", e); }

  let projectsByStatus = { planning: 0, in_progress: 0, review: 0, completed: 0, on_hold: 0 };
  try {
    const statusData = await db.select({ status: projects.status, count: count() }).from(projects).where(isNull(projects.deletedAt)).groupBy(projects.status);
    statusData?.forEach((item) => { if (item?.status && item.status in projectsByStatus) projectsByStatus[item.status as keyof typeof projectsByStatus] = Number(item.count) || 0; });
  } catch (e) { console.error("Error fetching project status:", e); }
  const totalProjects = Object.values(projectsByStatus).reduce((a, b) => a + b, 0);

  let recentTickets: Array<{ id: string; title: string; status: string; priority: string; createdAt: Date; clientName: string | null }> = [];
  try {
    const ticketsData = await db.select({ id: tickets.id, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt, clientName: clients.companyName }).from(tickets).leftJoin(clients, eq(tickets.clientId, clients.id)).where(isNull(tickets.deletedAt)).orderBy(desc(tickets.createdAt)).limit(6);
    recentTickets = ticketsData || [];
  } catch (e) { console.error("Error fetching recent data:", e); }

  const pipelineStatuses = [
    { key: 'in_progress' as const, label: 'Active Projects', count: projectsByStatus.in_progress, color: '#7C1CFF' },
    { key: 'planning' as const, label: 'Pipeline', count: projectsByStatus.planning, color: '#7C1CFF' },
    { key: 'review' as const, label: 'Review', count: projectsByStatus.review, color: '#9649FF' },
  ];

  return (
    <div className="bg-[#0B0E14] text-white min-h-full w-full">
      <div className="w-full">

        {/* ─── Dashboard Header / Filter Bar ─── */}
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/[0.05]">
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[13px] text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Oct 18 - Nov 18</span>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[13px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[13px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="px-8 py-8">
          {/* ─── Stats Grid (Nexus High-Fidelity Style) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Page Views Style Metric */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#4A1199]/15 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-[#9649FF]" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Active Projects</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-slate-700" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold tabular-nums">{projectStats.active}</span>
                <span className="flex items-center gap-1 text-[13px] font-bold text-emerald-500 mb-1">
                  15.8% <TrendingUp className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Total Revenue Style Metric */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#4A1199]/15 flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-[#9649FF]" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Open Tickets</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-slate-700" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold tabular-nums">{ticketStats.open}</span>
                <span className="flex items-center gap-1 text-[13px] font-bold text-red-500 mb-1">
                  34.0% <TrendingDown className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Bounce Rate Style Metric */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Platform Health</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-slate-700" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold tabular-nums">99.9%</span>
                <span className="flex items-center gap-1 text-[13px] font-bold text-emerald-500 mb-1">
                  Stable <Activity className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ─── Sales Overview Style Pipeline ─── */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <FolderKanban className="w-4 h-4 text-slate-500" />
                  <span className="text-[15px] font-bold">Project Pipeline</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1 text-xs font-bold rounded-md bg-white/[0.03] border border-white/[0.05] text-slate-400">View All</button>
                </div>
              </div>

              <div className="mb-10 text-slate-400">
                <span className="text-4xl font-bold tabular-nums text-white">Active Growth</span>
                <p className="text-[13px] mt-1 font-medium">
                  Project velocity is <span className="text-emerald-500 font-bold">Optimal</span> this month
                </p>
              </div>

              {/* Structured Analytical Chart Container */}
              <div className="relative w-full h-56 mt-4">
                {/* Horizontal Gridlines & Values */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                  {[100, 75, 50, 25, 0].map((val, idx) => (
                    <div key={idx} className="relative w-full flex items-center">
                      <span className="absolute -left-6 text-[10px] font-medium text-slate-600">{val}%</span>
                      <div className="w-full h-[1px] bg-white/[0.05]"></div>
                    </div>
                  ))}
                </div>

                {/* Chart Data Series */}
                <div className="absolute inset-0 left-6 right-2 bottom-0 flex items-end justify-between pt-4 pb-[1px] z-10 border-b border-white/[0.08]">
                  {[1, 2, 3, 4, 5, 6].map((i) => {
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full px-2 max-w-[80px] group">
                        <div className="w-full flex flex-col gap-[2px] justify-end h-[85%]">
                          {/* Top Segment */}
                          <div className="w-full relative rounded-t-xl rounded-b-[6px] overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_0_16px_rgba(150,73,255,0.15)] transition-all duration-300 group-hover:brightness-110 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_0_20px_rgba(150,73,255,0.25)]" style={{ height: `${20 + i * 10}%` }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-[#8B3DFF] to-[#6E22C9]"></div>
                          </div>

                          {/* Middle Segment */}
                          <div className="w-full relative rounded-[6px] overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.04)] transition-all duration-300 group-hover:brightness-110" style={{ height: `${10 + i * 5}%` }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-[#6E22C9] to-[#511394]"></div>
                          </div>

                          {/* Bottom Segment */}
                          <div className="w-full relative rounded-t-[6px] rounded-b-xl overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)] transition-all duration-300 group-hover:brightness-110" style={{ height: `${5 + i * i}%` }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-[#511394] to-[#3B0A70]"></div>
                          </div>
                        </div>
                        {/* X-Axis Label */}
                        <div className="mt-3 text-[11px] font-semibold text-slate-500 group-hover:text-slate-300 transition-colors">Q{i}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── List of Integration Style Recent Activity ─── */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-[15px] font-bold">Recent Tickets</span>
                </div>
                <Link href="/dashboard/admin/tickets" className="text-xs font-bold text-[#9649FF] hover:text-[#6316CC]">See All</Link>
              </div>

              <div className="space-y-4">
                {recentTickets.map((ticket, i) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/admin/tickets/${ticket.id}`}
                    className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-transform"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center overflow-hidden">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2",
                        ticket.status === 'open' ? "border-[#4A1199]/70" : "border-slate-700"
                      )}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white truncate leading-tight">{ticket.title}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{ticket.clientName || 'Client'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-white tabular-nums">{i * 20}%</p>
                      <div className="w-16 h-1 rounded-full bg-slate-800 mt-1 overflow-hidden">
                        <div className="h-full bg-[#4A1199] rounded-full" style={{ width: `${i * 20}%` }}></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
