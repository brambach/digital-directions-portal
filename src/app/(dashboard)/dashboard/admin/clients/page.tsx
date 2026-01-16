import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, count, desc, sql } from "drizzle-orm";
import Link from "next/link";
import {
  Users,
  Building2,
  Mail,
  FolderKanban,
  UserCircle,
  ArrowUpRight,
} from "lucide-react";
import dynamicImport from "next/dynamic";
import { ClientStatusMenu } from "@/components/client-status-menu";
import { formatDistanceToNow } from "date-fns";

// Lazy load dialog for better performance
const AddClientDialog = dynamicImport(
  () =>
    import("@/components/add-client-dialog").then((mod) => ({
      default: mod.AddClientDialog,
    })),
  {
    loading: () => null,
  }
);

export const dynamic = "force-dynamic";

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config = {
    active: {
      className: "badge-success",
      label: "Active",
      dot: true,
    },
    inactive: {
      className: "badge-neutral",
      label: "Inactive",
      dot: false,
    },
    archived: {
      className: "bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200",
      label: "Archived",
      dot: false,
    },
  }[status] || {
    className: "badge-neutral",
    label: status,
    dot: false,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${config.className}`}
    >
      {config.dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {config.label}
    </span>
  );
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
    .orderBy(desc(clients.createdAt));

  // Fetch project counts and user counts in batch (optimized - no N+1)
  const [projectCounts, userCounts] = await Promise.all([
    // Get all project counts grouped by clientId
    db
      .select({
        clientId: projects.clientId,
        totalCount: count(),
        activeCount:
          sql<number>`count(*) filter (where ${projects.status} in ('in_progress', 'planning', 'review'))`.as(
            "active_count"
          ),
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .groupBy(projects.clientId),

    // Get all user counts grouped by clientId
    db
      .select({
        clientId: users.clientId,
        count: count(),
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .groupBy(users.clientId),
  ]);

  // Create lookup maps for O(1) access
  const projectCountMap = new Map(
    projectCounts.map((p) => [
      p.clientId,
      { total: p.totalCount, active: Number(p.activeCount) },
    ])
  );
  const userCountMap = new Map(userCounts.map((u) => [u.clientId, u.count]));

  // Combine data efficiently
  const clientData = allClients.map((client) => {
    const projectData = projectCountMap.get(client.id) || {
      total: 0,
      active: 0,
    };
    const userCount = userCountMap.get(client.id) || 0;

    return {
      ...client,
      activeProjects: projectData.active,
      totalProjects: projectData.total,
      userCount,
    };
  });

  const activeCount = clientData.filter((c) => c.status === "active").length;
  const totalUsers = clientData.reduce((sum, c) => sum + c.userCount, 0);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-violet-500" />
              <span className="text-label text-violet-600">Directory</span>
            </div>
            <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
              Clients
            </h1>
            <p className="text-slate-500 max-w-lg">
              Complete directory of all client accounts, projects, and team
              members.
            </p>
          </div>
          <AddClientDialog />
        </header>

        {/* Table */}
        <div className="card-elevated overflow-hidden animate-fade-in-up opacity-0 stagger-2">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="grid grid-cols-12 gap-4 text-label text-slate-500">
              <div className="col-span-4">Company</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-2 text-center">Projects</div>
              <div className="col-span-2 text-center">Users</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {clientData.length === 0 ? (
              <div className="empty-state">
                <Users className="empty-state-icon" />
                <h3 className="empty-state-title">No clients yet</h3>
                <p className="empty-state-description">
                  Add your first client to get started.
                </p>
              </div>
            ) : (
              clientData.map((client, index) => (
                <div
                  key={client.id}
                  className="px-6 py-5 table-row group animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.15 + index * 0.03}s` }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Company Info */}
                    <div className="col-span-4">
                      <Link
                        href={`/dashboard/admin/clients/${client.id}`}
                        className="flex items-center gap-3 group/link"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm group-hover/link:scale-105 transition-transform">
                          {client.companyName
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate group-hover/link:text-violet-700 transition-colors flex items-center gap-1.5">
                            {client.companyName}
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </h3>
                          <p className="text-xs text-slate-400 truncate">
                            Added{" "}
                            {formatDistanceToNow(new Date(client.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Contact */}
                    <div className="col-span-2">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700 font-medium truncate">
                          {client.contactName}
                        </span>
                        <a
                          href={`mailto:${client.contactEmail}`}
                          className="text-xs text-slate-400 hover:text-violet-600 truncate transition-colors flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {client.contactEmail}
                        </a>
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="col-span-2">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold text-slate-900">
                            {client.totalProjects}
                          </span>
                        </div>
                        {client.activeProjects > 0 && (
                          <span className="text-xs text-emerald-600 font-medium">
                            {client.activeProjects} active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Users */}
                    <div className="col-span-2">
                      <div className="flex items-center justify-center gap-2">
                        <UserCircle className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">
                          {client.userCount}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex justify-center">
                      <StatusBadge status={client.status} />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <ClientStatusMenu
                        clientId={client.id}
                        currentStatus={client.status}
                        companyName={client.companyName}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-3 gap-4 animate-fade-in-up opacity-0 stagger-5">
          <div className="stat-card text-center">
            <div className="stat-value">{clientData.length}</div>
            <div className="stat-label">Total Clients</div>
          </div>
          <div className="stat-card text-center">
            <div className="stat-value text-emerald-600">{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card text-center">
            <div className="stat-value">{totalUsers}</div>
            <div className="stat-label">Portal Users</div>
          </div>
        </div>
      </div>
    </div>
  );
}
