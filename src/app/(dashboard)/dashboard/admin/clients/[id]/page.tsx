import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, clientActivity } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Building2, Calendar, Activity, FolderOpen, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export const dynamic = "force-dynamic";

// Helper function to get status badge styles
function getStatusBadge(status: string): { bg: string; text: string; border: string; label: string } {
  switch (status) {
    case "active":
      return { bg: "bg-green-50", text: "text-green-700", border: "border-green-100", label: "Active" };
    case "inactive":
      return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", label: "Inactive" };
    case "archived":
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", label: "Archived" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", label: status };
  }
}

// Helper function to get project status badge
function getProjectStatusBadge(status: string): { bg: string; text: string; border: string; label: string } {
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

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  // Fetch client data
  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!client) {
    notFound();
  }

  // Fetch client's projects
  const clientProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, id), isNull(projects.deletedAt)))
    .orderBy(projects.createdAt);

  // Fetch client activity
  const activity = await db
    .select()
    .from(clientActivity)
    .where(eq(clientActivity.clientId, id))
    .limit(1)
    .then((rows) => rows[0] || null);

  // Calculate project stats
  const totalProjects = clientProjects.length;
  const activeProjects = clientProjects.filter((p) =>
    p.status === "in_progress" || p.status === "planning" || p.status === "review"
  ).length;
  const completedProjects = clientProjects.filter((p) => p.status === "completed").length;

  const now = new Date();
  const overdueProjects = clientProjects.filter((p) =>
    p.dueDate && new Date(p.dueDate) < now && p.status !== "completed"
  ).length;

  const statusBadge = getStatusBadge(client.status);

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Back Button */}
      <Link
        href="/dashboard/admin/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* Client Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{client.companyName}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
              >
                {statusBadge.label}
              </span>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span className="font-medium text-gray-900">{client.contactName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${client.contactEmail}`} className="hover:text-blue-600 transition-colors">
                  {client.contactEmail}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Client since {format(new Date(client.createdAt), "MMMM d, yyyy")}
              </div>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
            Edit Client
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Total Projects</span>
            <FolderOpen className="text-gray-400 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{totalProjects}</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Active</span>
            <Clock className="text-blue-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{activeProjects}</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Completed</span>
            <CheckCircle className="text-green-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{completedProjects}</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Overdue</span>
            <AlertCircle className="text-red-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{overdueProjects}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              + New Project
            </button>
          </div>

          {clientProjects.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-500 text-sm">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientProjects.map((project) => {
                const projectStatus = getProjectStatusBadge(project.status);
                const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/admin/projects/${project.id}`}
                    className="block bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {project.description || "No description"}
                        </p>
                        {project.dueDate && (
                          <p className={`text-xs mt-2 ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                            Due {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${projectStatus.bg} ${projectStatus.text} border ${projectStatus.border} whitespace-nowrap`}
                      >
                        {projectStatus.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Sidebar */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Activity</h2>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">Last Login</span>
                </div>
                <p className="text-sm text-gray-900 ml-6">
                  {activity?.lastLogin
                    ? formatDistanceToNow(new Date(activity.lastLogin), { addSuffix: true })
                    : "Never"}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">Last Message</span>
                </div>
                <p className="text-sm text-gray-900 ml-6">
                  {activity?.lastMessageSent
                    ? formatDistanceToNow(new Date(activity.lastMessageSent), { addSuffix: true })
                    : "No messages yet"}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">Last File Download</span>
                </div>
                <p className="text-sm text-gray-900 ml-6">
                  {activity?.lastFileDownloaded
                    ? formatDistanceToNow(new Date(activity.lastFileDownloaded), { addSuffix: true })
                    : "No downloads yet"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">Quick Actions</p>
            <div className="space-y-2">
              <button className="w-full text-left text-sm text-blue-700 hover:text-blue-800 transition-colors">
                Send message
              </button>
              <button className="w-full text-left text-sm text-blue-700 hover:text-blue-800 transition-colors">
                Upload files
              </button>
              <button className="w-full text-left text-sm text-blue-700 hover:text-blue-800 transition-colors">
                View all activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
