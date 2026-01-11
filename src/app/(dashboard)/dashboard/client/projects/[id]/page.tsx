import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, files, messages } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, FileText, MessageSquare, Clock, Download, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { MessageForm } from "@/components/message-form";

export const dynamic = "force-dynamic";

// Helper function to get status badge styles
function getStatusBadge(status: string): { bg: string; text: string; border: string; label: string } {
  switch (status) {
    case "in_progress":
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", label: "In Progress" };
    case "review":
      return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100", label: "In Review" };
    case "completed":
      return { bg: "bg-green-50", text: "text-green-700", border: "border-green-100", label: "Completed" };
    case "on_hold":
      return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100", label: "On Hold" };
    case "planning":
      return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", label: "Planning" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", label: status };
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
  if (fileType.includes("pdf")) return "text-red-500";
  if (fileType.includes("image")) return "text-blue-500";
  if (fileType.includes("zip")) return "text-purple-500";
  if (fileType.includes("word") || fileType.includes("document")) return "text-blue-600";
  return "text-gray-500";
}

export default async function ClientProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  // Fetch project and verify it belongs to this client
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
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

  // Fetch project messages
  const projectMessages = await db
    .select({
      id: messages.id,
      content: messages.content,
      read: messages.read,
      createdAt: messages.createdAt,
      senderId: messages.senderId,
    })
    .from(messages)
    .where(and(eq(messages.projectId, id), isNull(messages.deletedAt)))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  const statusBadge = getStatusBadge(project.status);
  const now = new Date();
  const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Back Button */}
      <Link
        href="/dashboard/client"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Project Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{project.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
              >
                {statusBadge.label}
              </span>
            </div>

            {project.description && (
              <p className="text-gray-600 mb-4">{project.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {project.startDate && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Started {format(new Date(project.startDate), "MMM d, yyyy")}</span>
                </div>
              )}

              {project.dueDate && (
                <div className={`flex items-center gap-2 ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                  <Clock className="w-4 h-4" />
                  <span>
                    {isOverdue ? "Overdue" : "Due"} {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Files Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Files ({projectFiles.length})
              </h2>
            </div>

            {projectFiles.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-gray-500 text-sm">No files available yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
                {projectFiles.map((file) => (
                  <div key={file.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getFileIconColor(file.fileType)}`} strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Messages ({projectMessages.length})
              </h2>
            </div>

            {projectMessages.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-gray-500 text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
                {projectMessages.map((message) => (
                  <div key={message.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">Team Member</span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Message Input */}
            <div className="mt-4">
              <MessageForm projectId={id} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Project Details</h2>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
                >
                  {statusBadge.label}
                </span>
              </div>

              {project.startDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Start Date</p>
                  <p className="text-sm text-gray-900">{format(new Date(project.startDate), "MMMM d, yyyy")}</p>
                </div>
              )}

              {project.dueDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Due Date</p>
                  <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-900"}`}>
                    {format(new Date(project.dueDate), "MMMM d, yyyy")}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Files</p>
                <p className="text-sm text-gray-900">{projectFiles.length} {projectFiles.length === 1 ? "file" : "files"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Messages</p>
                <p className="text-sm text-gray-900">{projectMessages.length} {projectMessages.length === 1 ? "message" : "messages"}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">Need Help?</p>
            <p className="text-xs text-blue-700 mb-3">
              Have questions about this project? Send us a message above and we'll get back to you shortly.
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium">
              Contact Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
