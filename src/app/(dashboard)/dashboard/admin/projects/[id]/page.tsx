import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, users, integrationMonitors, messages } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, Layout, User, Clock, MessageSquare, Mail, Link as LinkIcon, Activity, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import dynamicImport from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectPhaseManager } from "@/components/project-phase-manager";
import { Card } from "@/components/ui/card";
import { IntegrationManagementSection } from "@/components/integration-management-section";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

// Lazy load dialogs
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

  // Fetch project
  const project = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
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

  // Fetch integrations
  const integrations = await db
    .select()
    .from(integrationMonitors)
    .where(and(eq(integrationMonitors.projectId, id), isNull(integrationMonitors.deletedAt)))
    .orderBy(desc(integrationMonitors.createdAt));

  // Fetch recent messages count
  const messagesCount = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.projectId, id), isNull(messages.deletedAt)))
    .then((rows) => rows.length);

  // Status styling
  const statusConfig: any = {
    planning: { color: "bg-violet-50 text-violet-700", label: "Planning Phase", icon: Layout },
    in_progress: { color: "bg-emerald-50 text-emerald-600", label: "In Active Development", icon: Activity },
    review: { color: "bg-amber-50 text-amber-600", label: "Under Review", icon: CheckCircle },
    completed: { color: "bg-gray-50 text-gray-600", label: "Project Completed", icon: CheckCircle },
    on_hold: { color: "bg-red-50 text-red-600", label: "On Hold", icon: AlertCircle },
  };

  const currentStatus = statusConfig[project.status] || statusConfig.planning;
  const StatusIcon = currentStatus.icon;

  const now = new Date();
  const daysLeft = project.dueDate ? differenceInDays(new Date(project.dueDate), now) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F4F7] p-6 lg:p-10 space-y-6 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Back & Breadcrumb */}
      <div className="flex items-center gap-2 animate-enter delay-100">
        <Link href="/dashboard/admin/projects" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm text-gray-400 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-gray-400 font-bold text-sm">/ {project.name}</span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Hero (Left) */}
        <div className="col-span-12 lg:col-span-8 animate-enter delay-200">
          <div className="bg-white rounded-xl p-8 lg:p-10 shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4", currentStatus.color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {currentStatus.label}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-3">
                    {project.name}
                  </h1>
                  <p className="text-gray-500 text-base max-w-xl">
                    {project.description || "Track project progress and manage deliverables across all implementation phases."}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-700 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-200">
                    {project.name.charAt(0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Area */}
            <div className="flex flex-wrap gap-3 items-center mt-8">
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
        </div>

        {/* Sidebar Stats (Right) */}
        <div className="col-span-12 lg:col-span-4 space-y-6 animate-enter delay-300">
          {/* Due Date Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-700">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Delivery</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "TBD"}
            </h3>
            {daysLeft !== null && (
              <p className={cn("text-xs font-semibold", daysLeft < 0 ? "text-red-500" : "text-emerald-500")}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)} Days Overdue` : `${daysLeft} Days Remaining`}
              </p>
            )}
          </div>

          {/* Messages Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-700">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team Updates</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{messagesCount}</h3>
            <p className="text-sm text-gray-500">Recent communications</p>
          </div>

          {/* Integrations Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                <LinkIcon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Systems</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{integrations.length}</h3>
            <p className="text-sm text-gray-500">Active integrations</p>
          </div>

          {/* Client Contact Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-700">
                <User className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Contact</p>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{project.clientContact}</h3>
            <p className="text-sm text-gray-500 truncate">{project.clientEmail}</p>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="animate-enter delay-400 space-y-8">
        {/* Phase Manager */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Roadmap Progress</h3>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <ProjectPhaseManager projectId={id} isAdmin={true} />
          </div>
        </section>

        {/* Connected Systems */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Connected Systems</h3>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <IntegrationManagementSection
              projectId={id}
              clientId={project.clientId}
              integrations={integrations}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
