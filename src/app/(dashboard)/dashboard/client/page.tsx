import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, files, messages, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { FolderOpen, FileText, MessageSquare, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

// Helper function to get status badge
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

export default async function ClientDashboard() {
  const user = await requireAuth();

  // Get client info
  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, user.clientId!), isNull(clients.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] || null);

  if (!client) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">No client profile found. Please contact your agency.</p>
        </div>
      </div>
    );
  }

  // Fetch all projects for this client
  const clientProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, client.id), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));

  // Get file and message counts for each project
  const projectData = await Promise.all(
    clientProjects.map(async (project) => {
      const [fileCount, messageCount, unreadCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(files)
          .where(eq(files.projectId, project.id))
          .then((rows) => rows[0]?.count || 0),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(and(eq(messages.projectId, project.id), isNull(messages.deletedAt)))
          .then((rows) => rows[0]?.count || 0),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.projectId, project.id),
              eq(messages.read, false),
              isNull(messages.deletedAt)
            )
          )
          .then((rows) => rows[0]?.count || 0),
      ]);

      return {
        ...project,
        fileCount,
        messageCount,
        unreadCount,
      };
    })
  );

  // Calculate stats
  const totalProjects = projectData.length;
  const activeProjects = projectData.filter((p) =>
    p.status === "in_progress" || p.status === "planning" || p.status === "review"
  ).length;
  const completedProjects = projectData.filter((p) => p.status === "completed").length;
  const totalFiles = projectData.reduce((sum, p) => sum + p.fileCount, 0);

  const now = new Date();

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Welcome back!</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening with your projects.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Projects</span>
            <FolderOpen className="text-gray-400 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{totalProjects}</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Active</span>
            <Clock className="text-blue-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{activeProjects}</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Completed</span>
            <CheckCircle className="text-green-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{completedProjects}</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Files</span>
            <FileText className="text-purple-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{totalFiles}</div>
        </div>
      </div>

      {/* Projects Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Projects</h2>

        {projectData.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-gray-500 text-lg font-medium mb-2">No projects yet</p>
            <p className="text-gray-400 text-sm">Your agency will create projects for you to view here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projectData.map((project) => {
              const statusBadge = getStatusBadge(project.status);
              const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

              return (
                <Link
                  key={project.id}
                  href={`/dashboard/client/projects/${project.id}`}
                  className="block bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex flex-col h-full">
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} whitespace-nowrap`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                    )}

                    {/* Due Date */}
                    {project.dueDate && (
                      <div className={`text-xs mb-4 flex items-center gap-1.5 ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                        {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>
                          {isOverdue ? "Overdue" : "Due"} {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                        </span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-auto pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>{project.fileCount} {project.fileCount === 1 ? "file" : "files"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>{project.messageCount} {project.messageCount === 1 ? "message" : "messages"}</span>
                        {project.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium text-white bg-blue-600 rounded-full">
                            {project.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
