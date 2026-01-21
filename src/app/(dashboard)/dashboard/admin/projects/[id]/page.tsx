import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, users, integrationMonitors, messages } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, Layout, User, Clock, MessageSquare, Mail, Link as LinkIcon } from "lucide-react";
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

  const statusColors: any = {
    planning: 'bg-indigo-100/50 text-indigo-700',
    in_progress: 'bg-emerald-100/50 text-emerald-700',
    review: 'bg-amber-100/50 text-amber-700',
    completed: 'bg-gray-100/50 text-gray-600',
    on_hold: 'bg-rose-100/50 text-rose-700'
  };

  const now = new Date();
  const daysLeft = project.dueDate ? differenceInDays(new Date(project.dueDate), now) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F4F7] p-6 lg:p-10 space-y-6 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Header */}
      <div className="flex items-center justify-between animate-enter delay-100">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/projects" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Project Details</h1>
        </div>
        <div className="flex gap-3">
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

      <div className="grid grid-cols-12 gap-6">
        {/* Main Hero Card */}
        <div className="col-span-12 lg:col-span-8 animate-enter delay-200">
          <div className="bg-white rounded-xl p-8 lg:p-10 shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  {project.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h2>
                  <p className="text-gray-500 font-medium text-sm">{project.clientName}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex-1">
              <p className="text-gray-500 text-base max-w-xl mb-6">
                {project.description || "Track project progress and manage deliverables across all implementation phases."}
              </p>

              {/* Status Pills */}
              <div className="flex flex-wrap gap-2">
                <span className={cn("inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold", statusColors[project.status])}>
                  {project.status.replace("_", " ")}
                </span>
                {daysLeft !== null && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    <Clock className="w-3 h-3 mr-1.5" />
                    {daysLeft} Days Left
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="col-span-12 lg:col-span-4 space-y-4 animate-enter delay-300">
          {/* Status Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                <Layout className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{project.status.replace("_", " ")}</h3>
            <p className="text-sm text-gray-500">Current Phase</p>
          </div>

          {/* Messages Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Messages</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{messagesCount}</h3>
            <p className="text-sm text-gray-500">Total communications</p>
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

          {/* Client Info Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <User className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Contact</p>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{project.clientContact}</h3>
            <p className="text-sm text-gray-500">{project.clientEmail}</p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Phases & Integrations */}
      <div className="grid grid-cols-12 gap-6 animate-enter delay-400">
        {/* Phases */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Roadmap</h3>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <ProjectPhaseManager projectId={id} isAdmin={true} />
          </div>
        </div>

        {/* Integrations */}
        <div className="col-span-12 lg:col-span-5">
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
        </div>
      </div>
    </div>
  );
}
