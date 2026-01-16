import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, files, messages, users, integrationMonitors } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, User, Building2, FileText, MessageSquare, Clock, Download, LayoutGrid } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import dynamicImport from "next/dynamic";
import { clerkClient } from "@clerk/nextjs/server";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { ProjectPhaseManager } from "@/components/project-phase-manager";
import { IntegrationManagementSection } from "@/components/integration-management-section";

// Lazy load heavy components for better performance
const MessageForm = dynamicImport(() => import("@/components/message-form").then(mod => ({ default: mod.MessageForm })), {
  loading: () => <div className="h-32 bg-slate-50 animate-pulse rounded-lg" />,
});
const FileUploader = dynamicImport(() => import("@/components/file-uploader").then(mod => ({ default: mod.FileUploader })), {
  loading: () => <div className="h-24 bg-slate-50 animate-pulse rounded-lg" />,
});
const EditProjectDialog = dynamicImport(() => import("@/components/edit-project-dialog").then(mod => ({ default: mod.EditProjectDialog })), {
  loading: () => null,
});
const UpdateStatusDialog = dynamicImport(() => import("@/components/update-status-dialog").then(mod => ({ default: mod.UpdateStatusDialog })), {
  loading: () => null,
});
const MessageList = dynamicImport(() => import("@/components/message-list").then(mod => ({ default: mod.MessageList })), {
  loading: () => <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-lg" />)}</div>,
});

export const dynamic = "force-dynamic";

// Helper function to get status badge styles
function getStatusBadge(status: string): { bg: string; text: string; border: string; label: string } {
  switch (status) {
    case "in_progress":
      return { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", label: "In Progress" };
    case "review":
      return { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", label: "In Review" };
    case "completed":
      return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Completed" };
    case "on_hold":
      return { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", label: "On Hold" };
    case "planning":
      return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", label: "Planning" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: status };
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Helper function to get file icon color
function getFileIconColor(fileType: string): string {
  if (fileType.includes("pdf")) return "text-red-400";
  if (fileType.includes("image")) return "text-purple-400";
  if (fileType.includes("zip")) return "text-purple-400";
  if (fileType.includes("word") || fileType.includes("document")) return "text-indigo-400";
  return "text-slate-400";
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  // Fetch project with client info
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
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!project) {
    notFound();
  }

  // Fetch project files
  const projectFiles = await db
    .select()
    .from(files)
    .where(eq(files.projectId, id))
    .orderBy(desc(files.uploadedAt));

  // Fetch integrations for this project
  const integrations = await db
    .select()
    .from(integrationMonitors)
    .where(and(eq(integrationMonitors.projectId, id), isNull(integrationMonitors.deletedAt)))
    .orderBy(desc(integrationMonitors.createdAt));

  // Fetch project messages with sender info
  const projectMessagesRaw = await db
    .select({
      id: messages.id,
      content: messages.content,
      read: messages.read,
      createdAt: messages.createdAt,
      senderId: messages.senderId,
      senderClerkId: users.clerkId,
      senderRole: users.role,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.projectId, id), isNull(messages.deletedAt)))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  // Fetch Clerk user info for senders
  const clerkIds = [...new Set(projectMessagesRaw.map((m) => m.senderClerkId).filter(Boolean))] as string[];
  const clerk = await clerkClient();

  const clerkUsers = clerkIds.length > 0
    ? await Promise.all(clerkIds.map(async (clerkId) => {
        try {
          return await clerk.users.getUser(clerkId);
        } catch {
          return null;
        }
      }))
    : [];

  const clerkUserMap = new Map(
    clerkUsers
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  // Enrich messages with sender names
  const projectMessages = projectMessagesRaw.map((message) => {
    const clerkUser = message.senderClerkId ? clerkUserMap.get(message.senderClerkId) : null;
    const senderName = clerkUser
      ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User"
      : "User";
    const senderAvatar = clerkUser?.imageUrl || null;

    return {
      id: message.id,
      content: message.content,
      read: message.read,
      createdAt: message.createdAt,
      senderId: message.senderId,
      senderName,
      senderAvatar,
      senderRole: message.senderRole,
    };
  });

  const statusBadge = getStatusBadge(project.status);
  const now = new Date();
  const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

  return (
    <>
      <AnimateOnScroll />
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 md:py-12">
        {/* Back Button */}
        <Link
          href="/dashboard/admin/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors [animation:animationIn_0.5s_ease-out_0s_both] animate-on-scroll"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        {/* Project Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] [animation:animationIn_0.5s_ease-out_0.1s_both] animate-on-scroll">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">{project.name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
                >
                  {statusBadge.label}
                </span>
              </div>

              {project.description && (
                <p className="text-slate-500 mb-4">{project.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium text-slate-700">{project.clientName}</span>
                  <span className="text-slate-300">•</span>
                  <span>{project.clientContact}</span>
                </div>

                {project.startDate && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>Started {format(new Date(project.startDate), "MMM d, yyyy")}</span>
                  </div>
                )}

                {project.dueDate && (
                  <div className={`flex items-center gap-2 ${isOverdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
                    <Clock className="w-4 h-4" />
                    <span>
                      {isOverdue ? "Overdue" : "Due"} {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
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

        {/* Project Phases */}
        <div className="mb-6 [animation:animationIn_0.5s_ease-out_0.15s_both] animate-on-scroll">
          <ProjectPhaseManager projectId={id} isAdmin={true} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-4 order-2 lg:order-1">
            <div className="flex items-center gap-3 [animation:animationIn_0.5s_ease-out_0.2s_both] animate-on-scroll">
              <LayoutGrid className="w-4 h-4 text-indigo-500" />
              <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Details</h2>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] [animation:animationIn_0.5s_ease-out_0.3s_both] animate-on-scroll">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Client</p>
                  <Link
                    href={`/dashboard/admin/clients/${project.clientId}`}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {project.clientName}
                  </Link>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Status</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {project.startDate && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Start Date</p>
                    <p className="text-sm text-slate-900">{format(new Date(project.startDate), "MMMM d, yyyy")}</p>
                  </div>
                )}

                {project.dueDate && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Due Date</p>
                    <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-slate-900"}`}>
                      {format(new Date(project.dueDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Created</p>
                  <p className="text-sm text-slate-900">
                    {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Section */}
            <div className="[animation:animationIn_0.5s_ease-out_0.35s_both] animate-on-scroll">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Messages</h2>
              </div>

              <MessageList projectId={id} initialMessages={projectMessages} />

              {/* Message Input */}
              <div className="mt-4">
                <MessageForm projectId={id} />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5 order-1 lg:order-2">
            {/* Files Section */}
            <div className="[animation:animationIn_0.5s_ease-out_0.2s_both] animate-on-scroll">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                    Files ({projectFiles.length})
                  </h2>
                </div>
                <FileUploader projectId={id} />
              </div>

              {projectFiles.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-slate-500 text-sm">No files uploaded yet</p>
                  <p className="text-slate-400 text-xs mt-1">Upload project files using the button above</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl divide-y divide-slate-100 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                  {projectFiles.map((file) => (
                    <div key={file.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <FileText className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getFileIconColor(file.fileType)}`} strokeWidth={1.5} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>•</span>
                              <span>Uploaded {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 transition-colors flex-shrink-0"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Integrations Section */}
            <div className="[animation:animationIn_0.5s_ease-out_0.25s_both] animate-on-scroll">
              <IntegrationManagementSection
                projectId={id}
                clientId={project.clientId}
                integrations={integrations}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
