import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, integrationMonitors, clientFlags } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Link as LinkIcon, User, Activity, CheckCircle, AlertCircle, Layout, Pencil, RefreshCw } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import dynamicImport from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IntegrationManagementSection } from "@/components/integration-management-section";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { AdminFlagSection } from "@/components/admin-flag-section";
import { StageAdvanceButton } from "@/components/stage-advance-button";
import { stageSlug } from "@/lib/lifecycle";

const EditProjectDialog = dynamicImport(
  () => import("@/components/edit-project-dialog").then((mod) => ({ default: mod.EditProjectDialog })),
  { loading: () => null }
);
const UpdateStatusDialog = dynamicImport(
  () => import("@/components/update-status-dialog").then((mod) => ({ default: mod.UpdateStatusDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const project = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      currentStage: projects.currentStage,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      createdAt: projects.createdAt,
      clientId: projects.clientId,
      clientName: clients.companyName,
      clientContact: clients.contactName,
      clientEmail: clients.contactEmail,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!project) {
    notFound();
  }

  const integrations = await db
    .select()
    .from(integrationMonitors)
    .where(and(eq(integrationMonitors.projectId, id), isNull(integrationMonitors.deletedAt)))
    .orderBy(desc(integrationMonitors.createdAt));

  const unresolvedFlags = await db
    .select()
    .from(clientFlags)
    .where(
      and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))
    );

  const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
    planning: { color: "bg-purple-50 text-purple-700", label: "Planning", icon: Layout },
    in_progress: { color: "bg-emerald-50 text-emerald-600", label: "In Progress", icon: Activity },
    review: { color: "bg-amber-50 text-amber-600", label: "Under Review", icon: CheckCircle },
    completed: { color: "bg-slate-50 text-slate-600", label: "Completed", icon: CheckCircle },
    on_hold: { color: "bg-red-50 text-red-600", label: "On Hold", icon: AlertCircle },
  };

  const currentStatus = statusConfig[project.status] || statusConfig.planning;
  const StatusIcon = currentStatus.icon;

  const now = new Date();
  const daysLeft = project.dueDate ? differenceInDays(new Date(project.dueDate), now) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-6 lg:p-10 space-y-6 no-scrollbar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/projects" className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm border border-slate-100 text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", currentStatus.color)}>
                <StatusIcon className="w-3 h-3" />
                {currentStatus.label}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {project.clientName} &middot; {project.description || "HiBob integration project"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stageSlug(project.currentStage) === null && (
            <StageAdvanceButton projectId={project.id} currentStage={project.currentStage} />
          )}
          <EditProjectDialog
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              startDate: project.startDate,
              dueDate: project.dueDate,
            }}
          />
          <UpdateStatusDialog projectId={project.id} currentStatus={project.status} />
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/admin/projects"
      />

      {/* Flags */}
      <AdminFlagSection
        flags={unresolvedFlags.map((f) => ({
          id: f.id,
          message: f.message,
          type: f.type,
          createdAt: f.createdAt.toISOString(),
        }))}
        projectId={id}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery</p>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "TBD"}
          </p>
          {daysLeft !== null && (
            <p className={cn("text-xs font-semibold mt-1", daysLeft < 0 ? "text-red-500" : "text-emerald-500")}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <LinkIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Systems</p>
          </div>
          <p className="text-lg font-bold text-slate-900">{integrations.length}</p>
          <p className="text-xs text-slate-400 mt-1">Active integrations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <User className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
          </div>
          <p className="text-sm font-bold text-slate-900">{project.clientContact}</p>
          <p className="text-xs text-slate-400 mt-1 truncate">{project.clientEmail}</p>
        </div>
      </div>

      {/* Connected Systems */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Connected Systems</h3>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <IntegrationManagementSection
            projectId={id}
            clientId={project.clientId}
            integrations={integrations}
          />
        </div>
      </div>
    </div>
  );
}
