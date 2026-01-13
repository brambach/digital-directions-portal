import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, count, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Users, Building2, Mail, FolderKanban, UserCircle, ExternalLink } from "lucide-react";
import dynamicImport from "next/dynamic";
import { ClientStatusMenu } from "@/components/client-status-menu";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { formatDistanceToNow } from "date-fns";

// Lazy load dialog for better performance
const AddClientDialog = dynamicImport(() => import("@/components/add-client-dialog").then(mod => ({ default: mod.AddClientDialog })), {
  loading: () => null,
});

export const dynamic = "force-dynamic";

// Helper function to get status badge
function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-[pulse_3s_ease-in-out_infinite]"></span>
          Active
        </span>
      );
    case "inactive":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider shadow-sm">
          Inactive
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-slate-400 border border-slate-200 uppercase tracking-wider shadow-sm">
          Archived
        </span>
      );
    default:
      return null;
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
    .orderBy(desc(clients.createdAt));

  // Fetch project counts and user counts in batch (optimized - no N+1)
  const [projectCounts, userCounts] = await Promise.all([
    // Get all project counts grouped by clientId
    db
      .select({
        clientId: projects.clientId,
        totalCount: count(),
        activeCount: sql<number>`count(*) filter (where ${projects.status} in ('in_progress', 'planning', 'review'))`.as('active_count'),
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
    projectCounts.map((p) => [p.clientId, { total: p.totalCount, active: Number(p.activeCount) }])
  );
  const userCountMap = new Map(userCounts.map((u) => [u.clientId, u.count]));

  // Combine data efficiently
  const clientData = allClients.map((client) => {
    const projectData = projectCountMap.get(client.id) || { total: 0, active: 0 };
    const userCount = userCountMap.get(client.id) || 0;

    return {
      ...client,
      activeProjects: projectData.active,
      totalProjects: projectData.total,
      userCount,
    };
  });

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-indigo-600" />
              Clients
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              Complete directory of all client accounts, projects, and team members.
            </p>
          </div>
          <AddClientDialog />
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] overflow-hidden animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div className="grid grid-cols-12 gap-4 text-[11px] font-bold text-slate-600 uppercase tracking-widest">
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
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-slate-600 text-lg font-medium mb-2">No clients yet</p>
                <p className="text-slate-400 text-sm">Add your first client to get started.</p>
              </div>
            ) : (
              clientData.map((client, index) => (
                <div
                  key={client.id}
                  className="px-6 py-5 hover:bg-slate-50/50 transition-colors group animate-on-scroll"
                  style={{ animation: `animationIn 0.5s ease-out ${0.3 + index * 0.05}s both` }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Company Info */}
                    <div className="col-span-4">
                      <Link
                        href={`/dashboard/admin/clients/${client.id}`}
                        className="flex items-center gap-3 group/link"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm group-hover:bg-indigo-100 transition-colors">
                          {client.companyName
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate group-hover/link:text-indigo-600 transition-colors flex items-center gap-2">
                            {client.companyName}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </h3>
                          <p className="text-xs text-slate-400 truncate">
                            Added {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Contact */}
                    <div className="col-span-2">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700 font-medium truncate">{client.contactName}</span>
                        <a
                          href={`mailto:${client.contactEmail}`}
                          className="text-xs text-slate-400 hover:text-indigo-600 truncate transition-colors flex items-center gap-1"
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
                          <FolderKanban className="w-4 h-4 text-indigo-500" />
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
                      {getStatusBadge(client.status)}
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
        <div className="mt-6 grid grid-cols-3 gap-4 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.8s_both]">
          <div className="bg-white px-4 py-3 rounded-lg border border-slate-200 text-center">
            <div className="text-2xl font-semibold text-slate-900">{clientData.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Total Clients</div>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-slate-200 text-center">
            <div className="text-2xl font-semibold text-slate-900">
              {clientData.filter(c => c.status === "active").length}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Active</div>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-slate-200 text-center">
            <div className="text-2xl font-semibold text-slate-900">
              {clientData.reduce((sum, c) => sum + c.userCount, 0)}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Portal Users</div>
          </div>
        </div>
      </div>
    </>
  );
}
