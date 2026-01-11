import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, clientActivity } from "@/lib/db/schema";
import { eq, isNull, and, count, sql } from "drizzle-orm";
import Link from "next/link";
import { Users, Activity, Archive, FolderOpen, Zap, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { AddClientDialog } from "@/components/add-client-dialog";

export const dynamic = "force-dynamic";

// Helper function to get avatar initials
function getInitials(companyName: string): string {
  return companyName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Helper function to get avatar color based on company name
function getAvatarColor(companyName: string): { bg: string; text: string; border: string } {
  const colors = [
    { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
    { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
    { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
    { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-100" },
    { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  ];

  const index = companyName.charCodeAt(0) % colors.length;
  return colors[index];
}

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

export default async function ClientsPage() {
  await requireAdmin();

  // Fetch all clients with their projects
  const allClients = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
      contactName: clients.contactName,
      contactEmail: clients.contactEmail,
      status: clients.status,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(clients.createdAt);

  // Fetch project counts and statuses for each client
  const clientData = await Promise.all(
    allClients.map(async (client) => {
      const projectsData = await db
        .select({
          id: projects.id,
          status: projects.status,
          dueDate: projects.dueDate,
        })
        .from(projects)
        .where(and(eq(projects.clientId, client.id), isNull(projects.deletedAt)));

      // Count project types
      const activeProjects = projectsData.filter((p) =>
        p.status === "in_progress" || p.status === "planning" || p.status === "review"
      ).length;

      const completedProjects = projectsData.filter((p) => p.status === "completed").length;

      // Check for overdue projects
      const now = new Date();
      const overdueProjects = projectsData.filter((p) =>
        p.dueDate && new Date(p.dueDate) < now && p.status !== "completed"
      ).length;

      return {
        ...client,
        activeProjects,
        completedProjects,
        overdueProjects,
      };
    })
  );

  // Calculate stats
  const totalClients = clientData.length;
  const activeClients = clientData.filter((c) => c.status === "active").length;
  const archivedClients = clientData.filter((c) => c.status === "archived").length;

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your client relationships and projects.</p>
        </div>
        <AddClientDialog />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Clients */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Clients</span>
            <Users className="text-gray-400 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{totalClients}</div>
        </div>

        {/* Active Clients */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Active</span>
            <Activity className="text-green-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{activeClients}</div>
        </div>

        {/* Archived Clients */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Archived</span>
            <Archive className="text-gray-400 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{archivedClients}</div>
        </div>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {clientData.map((client) => {
          const avatarColor = getAvatarColor(client.companyName);
          const statusBadge = getStatusBadge(client.status);
          const initials = getInitials(client.companyName);

          // Determine project status text and icon
          let projectStatusText = "";
          let projectStatusIcon = null;
          let projectStatusColor = "text-gray-500";

          if (client.overdueProjects > 0) {
            projectStatusText = `${client.overdueProjects} overdue project${client.overdueProjects > 1 ? "s" : ""}`;
            projectStatusIcon = <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />;
            projectStatusColor = "text-red-500";
          } else if (client.activeProjects > 0) {
            projectStatusText = `${client.activeProjects} active project${client.activeProjects > 1 ? "s" : ""}`;
            projectStatusIcon = client.companyName === "StartupX" ?
              <Zap className="w-3.5 h-3.5" strokeWidth={1.5} /> :
              <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />;
            projectStatusColor = "text-gray-500";
          } else if (client.completedProjects > 0) {
            projectStatusText = `${client.completedProjects} completed project${client.completedProjects > 1 ? "s" : ""}`;
            projectStatusIcon = <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />;
            projectStatusColor = "text-gray-500";
          } else {
            projectStatusText = "No projects";
            projectStatusIcon = <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />;
            projectStatusColor = "text-gray-400";
          }

          return (
            <div
              key={client.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md hover:scale-[1.01] transition-all duration-200 flex justify-between items-start group"
            >
              <div className="flex gap-4">
                {/* Avatar */}
                <div
                  className={`h-12 w-12 shrink-0 rounded-full ${avatarColor.bg} ${avatarColor.text} flex items-center justify-center font-semibold text-lg border ${avatarColor.border} tracking-tight`}
                >
                  {initials}
                </div>
                {/* Info */}
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                    {client.companyName}
                  </h3>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                      {client.contactName}
                    </div>
                    <div className="text-sm text-gray-500">{client.contactEmail}</div>
                  </div>
                  <div className={`mt-3 flex items-center gap-1.5 text-xs ${projectStatusColor}`}>
                    {projectStatusIcon}
                    <span>{projectStatusText}</span>
                  </div>
                </div>
              </div>
              {/* Right Side */}
              <div className="flex flex-col items-end gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
                >
                  {statusBadge.label}
                </span>
                <Link
                  href={`/dashboard/admin/clients/${client.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition-colors mt-1"
                >
                  View Details
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
