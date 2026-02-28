import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, integrationMonitors, projectPhases } from "@/lib/db/schema";
import { eq, isNull, and, desc, count, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  FolderKanban,
  Activity,
  ListChecks,
  Calendar,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DigiFloat } from "@/components/motion/digi-float";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger-container";
import { CountUp } from "@/components/motion/count-up";
import { AmberPulse } from "@/components/motion/amber-pulse";

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

  const activeProjectsCount = clientProjects.filter((p) => p.currentStage !== "support").length;

  const integrationsCount = await db
    .select({ count: count() })
    .from(integrationMonitors)
    .where(and(eq(integrationMonitors.clientId, client.id), isNull(integrationMonitors.deletedAt)))
    .then((r) => r[0]?.count || 0);

  const projectIds = clientProjects.map((p) => p.id);

  const activePhases = projectIds.length > 0
    ? await db
        .select({
          id: projectPhases.id,
          name: projectPhases.name,
          description: projectPhases.description,
          projectId: projectPhases.projectId,
          projectName: projects.name,
          startedAt: projectPhases.startedAt,
        })
        .from(projectPhases)
        .innerJoin(projects, eq(projectPhases.projectId, projects.id))
        .where(and(inArray(projectPhases.projectId, projectIds), eq(projectPhases.status, "in_progress")))
        .orderBy(projectPhases.startedAt)
        .limit(4)
    : [];

  const activePhaseCount = activePhases.length;

  const pendingPhases = projectIds.length > 0
    ? await db
        .select({
          id: projectPhases.id,
          name: projectPhases.name,
          description: projectPhases.description,
          projectId: projectPhases.projectId,
          projectName: projects.name,
          orderIndex: projectPhases.orderIndex,
        })
        .from(projectPhases)
        .innerJoin(projects, eq(projectPhases.projectId, projects.id))
        .where(and(inArray(projectPhases.projectId, projectIds), eq(projectPhases.status, "pending")))
        .orderBy(projectPhases.orderIndex)
    : [];

  // First pending phase per project (what comes next after the current step)
  const upcomingPhases = Object.values(
    pendingPhases.reduce((acc, phase) => {
      if (!acc[phase.projectId]) acc[phase.projectId] = phase;
      return acc;
    }, {} as Record<string, typeof pendingPhases[0]>)
  ).slice(0, 3);

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
      label: "System Health",
      value: integrationsCount > 0 ? `${integrationsCount} Active` : "—",
      sub: integrationsCount > 0 ? "Integrations monitored" : "No monitors configured",
      icon: Activity,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      href: "/dashboard/client/projects",
    },
    {
      label: "Active Phases",
      value: activePhaseCount.toString(),
      sub: activePhaseCount > 0 ? "Phases in progress" : "No phases in progress",
      icon: ListChecks,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      href: "/dashboard/client/projects",
    },
  ];

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
    pre_sales: "text-slate-600 bg-slate-100",
    discovery: "text-sky-700 bg-sky-50",
    provisioning: "text-blue-700 bg-blue-50",
    bob_config: "text-indigo-700 bg-indigo-50",
    mapping: "text-violet-700 bg-violet-50",
    build: "text-purple-700 bg-purple-50",
    uat: "text-amber-700 bg-amber-50",
    go_live: "text-emerald-700 bg-emerald-50",
    support: "text-teal-700 bg-teal-50",
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

      <StaggerContainer className="px-7 py-6 space-y-6">
        {/* ── Stat Cards ─────────────────────────────────────────── */}
        <StaggerItem>
        <div className="grid grid-cols-3 gap-4">
          {STATS.map((stat) => {
            const numericValue = parseInt(stat.value, 10);
            const isNumeric = !isNaN(numericValue) && stat.value === numericValue.toString();
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
                {isNumeric ? <CountUp value={numericValue} /> : stat.value}
              </p>
              <div className="mt-3">
                <span className="text-[12px] text-slate-400">{stat.sub}</span>
              </div>
            </Link>
            );
          })}
        </div>
        </StaggerItem>

        {/* ── Main Grid ──────────────────────────────────────────── */}
        <StaggerItem>
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
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", STAGE_COLORS[project.currentStage] || "text-slate-600 bg-slate-100")}>
                      {STAGE_LABELS[project.currentStage] || project.currentStage}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Action Required + Recent Activity */}
          <div className="lg:col-span-5 space-y-5">
            {/* Action Required */}
            <AmberPulse active={activePhases.length > 0} className="rounded-2xl">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <ListChecks className="w-4 h-4 text-amber-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-800">Your Current Steps</h2>
                    <p className="text-[12px] text-slate-400">Active implementation phases</p>
                  </div>
                </div>
                {activePhases.length > 0 && (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {activePhases.length} active
                  </span>
                )}
              </div>

              {activePhases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DigiFloat variant="celebrating" size="sm" className="mb-3" />
                  <p className="text-[13px] font-semibold text-slate-700">All caught up!</p>
                  <p className="text-[12px] text-slate-400 mt-1">No active phases right now</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activePhases.map((phase) => (
                    <Link
                      key={phase.id}
                      href={`/dashboard/client/projects/${phase.projectId}`}
                      className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                          Current Step
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">{phase.projectName}</span>
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                        {phase.name}
                      </p>
                      {phase.description && (
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {phase.description}
                        </p>
                      )}
                    </Link>
                  ))}
                  <Link
                    href="/dashboard/client/projects"
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-[12px] font-semibold text-slate-500 hover:text-violet-600 transition-colors"
                  >
                    View all projects <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
            </AmberPulse>

            {/* Up Next */}
            {upcomingPhases.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-sky-600" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">Up Next</h2>
                  <p className="text-[12px] text-slate-400">Coming after your current step</p>
                </div>
              </div>
              <div className="space-y-2">
                {upcomingPhases.map((phase) => (
                  <Link
                    key={phase.id}
                    href={`/dashboard/client/projects/${phase.projectId}`}
                    className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/30 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                        Upcoming
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">{phase.projectName}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                      {phase.name}
                    </p>
                    {phase.description && (
                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                        {phase.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
            )}

          </div>
        </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
