import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projects,
  files,
  messages,
  users,
  integrationMonitors,
} from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  MessageSquare,
  Clock,
  Download,
  Activity,
  FolderOpen,
  ExternalLink,
  HelpCircle,
  Ticket,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { MessageForm } from "@/components/message-form";
import { clerkClient } from "@clerk/nextjs/server";
import { MessageList } from "@/components/message-list";
import { ContactTeamButton } from "@/components/contact-team-button";
import { ProjectPhaseManager } from "@/components/project-phase-manager";
import { IntegrationHealthGrid } from "@/components/integration-health-grid";

export const dynamic = "force-dynamic";

// Status badge configurations
const statusConfig = {
  in_progress: {
    label: "In Progress",
    className: "badge-primary",
    dot: true,
  },
  review: {
    label: "In Review",
    className: "badge-info",
    dot: true,
  },
  completed: {
    label: "Completed",
    className: "badge-success",
    dot: false,
  },
  on_hold: {
    label: "On Hold",
    className: "badge-warning",
    dot: false,
  },
  planning: {
    label: "Planning",
    className: "badge-neutral",
    dot: false,
  },
} as const;

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Helper function to get file icon styling
function getFileTypeInfo(fileType: string): {
  color: string;
  bg: string;
  label: string;
} {
  if (fileType.includes("pdf"))
    return { color: "text-red-600", bg: "bg-red-50", label: "PDF" };
  if (fileType.includes("image"))
    return { color: "text-violet-600", bg: "bg-violet-50", label: "Image" };
  if (fileType.includes("zip"))
    return { color: "text-amber-600", bg: "bg-amber-50", label: "Archive" };
  if (fileType.includes("word") || fileType.includes("document"))
    return { color: "text-blue-600", bg: "bg-blue-50", label: "Document" };
  if (fileType.includes("sheet") || fileType.includes("excel"))
    return { color: "text-emerald-600", bg: "bg-emerald-50", label: "Spreadsheet" };
  return { color: "text-slate-600", bg: "bg-slate-50", label: "File" };
}

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  // Fetch project and verify it belongs to this client
  const project = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.clientId, user.clientId!),
        isNull(projects.deletedAt)
      )
    )
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
    .where(
      and(
        eq(integrationMonitors.projectId, id),
        isNull(integrationMonitors.deletedAt)
      )
    )
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
  const clerkIds = [
    ...new Set(
      projectMessagesRaw.map((m) => m.senderClerkId).filter(Boolean)
    ),
  ] as string[];
  const clerk = await clerkClient();

  const clerkUsers =
    clerkIds.length > 0
      ? await Promise.all(
          clerkIds.map(async (clerkId) => {
            try {
              return await clerk.users.getUser(clerkId);
            } catch {
              return null;
            }
          })
        )
      : [];

  const clerkUserMap = new Map(
    clerkUsers
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  // Enrich messages with sender names
  const projectMessages = projectMessagesRaw.map((message) => {
    const clerkUser = message.senderClerkId
      ? clerkUserMap.get(message.senderClerkId)
      : null;
    const senderName = clerkUser
      ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        "Team Member"
      : "Team Member";
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

  const config =
    statusConfig[project.status as keyof typeof statusConfig] ||
    statusConfig.planning;
  const now = new Date();
  const isOverdue =
    project.dueDate &&
    new Date(project.dueDate) < now &&
    project.status !== "completed";

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        {/* Back Navigation */}
        <Link
          href="/dashboard/client/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 mb-8 transition-colors animate-fade-in-up opacity-0 stagger-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        {/* Project Header Card */}
        <div className="card-elevated p-8 mb-8 animate-fade-in-up opacity-0 stagger-1">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h1 className="text-display text-3xl text-slate-900">
                  {project.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${config.className}`}
                >
                  {config.dot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  )}
                  {config.label}
                </span>
              </div>

              {project.description && (
                <p className="text-slate-500 mb-6 max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                {project.startDate && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Started</p>
                      <p className="font-medium text-slate-700">
                        {format(new Date(project.startDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                {project.dueDate && (
                  <div
                    className={`flex items-center gap-2 ${isOverdue ? "text-red-600" : "text-slate-500"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOverdue ? "bg-red-50" : "bg-slate-100"}`}
                    >
                      {isOverdue ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-xs ${isOverdue ? "text-red-500" : "text-slate-400"}`}
                      >
                        {isOverdue ? "Overdue" : "Due Date"}
                      </p>
                      <p
                        className={`font-medium ${isOverdue ? "text-red-700" : "text-slate-700"}`}
                      >
                        {format(new Date(project.dueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Files</p>
                    <p className="font-medium text-slate-700">
                      {projectFiles.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Messages</p>
                    <p className="font-medium text-slate-700">
                      {projectMessages.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Phases */}
        <div className="mb-8 animate-fade-in-up opacity-0 stagger-2">
          <ProjectPhaseManager projectId={id} isAdmin={false} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Files & Integrations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Files Section */}
            <section className="animate-fade-in-up opacity-0 stagger-3">
              <div className="section-divider mb-4">
                <FileText className="w-4 h-4 text-violet-500" />
                <span>Project Files ({projectFiles.length})</span>
              </div>

              {projectFiles.length === 0 ? (
                <div className="card-elevated">
                  <div className="empty-state">
                    <FolderOpen className="empty-state-icon" />
                    <h3 className="empty-state-title">No files yet</h3>
                    <p className="empty-state-description">
                      Files will appear here when your team uploads them
                    </p>
                  </div>
                </div>
              ) : (
                <div className="card-elevated overflow-hidden divide-y divide-slate-100">
                  {projectFiles.map((file, index) => {
                    const typeInfo = getFileTypeInfo(file.fileType);
                    return (
                      <div
                        key={file.id}
                        className="p-4 hover:bg-slate-50/50 transition-colors group animate-fade-in-up opacity-0"
                        style={{ animationDelay: `${0.2 + index * 0.03}s` }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}
                            >
                              <FileText
                                className={`w-5 h-5 ${typeInfo.color}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                <span
                                  className={`px-1.5 py-0.5 rounded ${typeInfo.bg} ${typeInfo.color} text-[10px] font-semibold`}
                                >
                                  {typeInfo.label}
                                </span>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>
                                  {formatDistanceToNow(
                                    new Date(file.uploadedAt),
                                    { addSuffix: true }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-violet-600 hover:text-violet-700 hover:bg-violet-50 transition-colors text-sm font-medium flex-shrink-0"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Download</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Integrations Section */}
            <section className="animate-fade-in-up opacity-0 stagger-4">
              <div className="section-divider mb-4">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Integration Health</span>
              </div>
              <IntegrationHealthGrid clientId={project.clientId} />
            </section>
          </div>

          {/* Right Column - Messages & Support */}
          <div className="space-y-6">
            {/* Messages Section */}
            <section className="animate-fade-in-up opacity-0 stagger-3">
              <div className="section-divider mb-4">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span>Messages</span>
              </div>

              <div className="card-elevated overflow-hidden">
                <MessageList projectId={id} initialMessages={projectMessages} />

                {/* Message Input */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <MessageForm projectId={id} />
                </div>
              </div>
            </section>

            {/* Help Card */}
            <div className="card-elevated p-6 bg-gradient-to-br from-violet-50 to-white border-violet-100 animate-fade-in-up opacity-0 stagger-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-heading text-slate-900">Need Help?</h3>
              </div>

              <div className="space-y-3 mb-5">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 mb-1">
                    Quick Questions
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Use the message form above for quick questions. Messages are
                    free and don&apos;t count toward support hours.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 mb-1">
                    Project Support
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Need hands-on work? Create a support ticket that counts
                    toward your monthly support package.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <ContactTeamButton />
                <Link
                  href="/dashboard/client/tickets"
                  className="btn-secondary w-full justify-center"
                >
                  <Ticket className="w-4 h-4" />
                  Create Support Ticket
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div className="card-elevated p-4 animate-fade-in-up opacity-0 stagger-5">
              <h3 className="text-label text-slate-500 mb-3">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard/client"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-sm text-slate-600 group-hover:text-slate-900">
                    Dashboard
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500" />
                </Link>
                <Link
                  href="/dashboard/client/projects"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-sm text-slate-600 group-hover:text-slate-900">
                    All Projects
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500" />
                </Link>
                <Link
                  href="/dashboard/client/tickets"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-sm text-slate-600 group-hover:text-slate-900">
                    Support Tickets
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
