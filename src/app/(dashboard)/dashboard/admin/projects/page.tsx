import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import Link from "next/link";
import { FolderOpen, Clock, CheckCircle, AlertCircle, Pause, FileSearch } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AddProjectDialog } from "@/components/add-project-dialog";

export const dynamic = "force-dynamic";

// Helper function to get status badge styles
function getStatusBadge(status: string): { bg: string; text: string; border: string; label: string; icon: any } {
  switch (status) {
    case "in_progress":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-100",
        label: "In Progress",
        icon: FolderOpen
      };
    case "review":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-100",
        label: "In Review",
        icon: FileSearch
      };
    case "completed":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-100",
        label: "Completed",
        icon: CheckCircle
      };
    case "on_hold":
      return {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-100",
        label: "On Hold",
        icon: Pause
      };
    case "planning":
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-200",
        label: "Planning",
        icon: Clock
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-600",
        border: "border-gray-200",
        label: status,
        icon: FolderOpen
      };
  }
}

export default async function ProjectsPage() {
  await requireAdmin();

  // Fetch all clients for the project form
  const allClients = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
    })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(clients.companyName);

  // Fetch all projects with their client info
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
      clientName: clients.companyName,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(isNull(projects.deletedAt))
    .orderBy(projects.createdAt);

  // Calculate stats
  const totalProjects = allProjects.length;
  const activeProjects = allProjects.filter((p) =>
    p.status === "in_progress" || p.status === "planning" || p.status === "review"
  ).length;
  const completedProjects = allProjects.filter((p) => p.status === "completed").length;

  // Check for overdue projects
  const now = new Date();
  const overdueProjects = allProjects.filter((p) =>
    p.dueDate && new Date(p.dueDate) < now && p.status !== "completed"
  ).length;

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all client projects and deliverables.</p>
        </div>
        <AddProjectDialog clients={allClients} />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Projects */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total</span>
            <FolderOpen className="text-gray-400 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{totalProjects}</div>
        </div>

        {/* Active Projects */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Active</span>
            <Clock className="text-blue-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{activeProjects}</div>
        </div>

        {/* Completed Projects */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Completed</span>
            <CheckCircle className="text-green-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{completedProjects}</div>
        </div>

        {/* Overdue Projects */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Overdue</span>
            <AlertCircle className="text-red-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{overdueProjects}</div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {allProjects.map((project) => {
          const statusBadge = getStatusBadge(project.status);
          const StatusIcon = statusBadge.icon;
          const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

          return (
            <div
              key={project.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <StatusIcon className={`w-5 h-5 ${statusBadge.text}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {project.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{project.clientName}</span>
                        {project.dueDate && (
                          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                            Due {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
                  >
                    {statusBadge.label}
                  </span>
                  <Link
                    href={`/dashboard/admin/projects/${project.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
