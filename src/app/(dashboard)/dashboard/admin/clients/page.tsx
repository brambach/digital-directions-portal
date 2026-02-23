import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, count, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Users } from "lucide-react";
import dynamicImport from "next/dynamic";
import { ClientStatusMenu } from "@/components/client-status-menu";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DigiMascot } from "@/components/digi-mascot";

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
  const variants: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    inactive: 'bg-gray-50 text-gray-500 border-gray-100',
    archived: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
      variants[status] || variants.inactive
    )}>
      {status}
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

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-8 space-y-8 no-scrollbar relative font-geist">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor all client organizations.</p>
        </div>
        <div className="flex items-center gap-3">
          <AddClientDialog />
        </div>
      </div>

      {/* Directory Table */}
      <div className="animate-enter delay-200">
        <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-white px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 uppercase tracking-widest">
              All Clients
              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">{clientData.length}</span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-50 bg-white">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projects</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Portal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="w-10 px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm bg-white">
              {clientData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <DigiMascot variant="neutral" size="sm" className="mb-3" />
                      <p className="text-[13px] font-semibold text-slate-700">No clients found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clientData.map((client, idx) => (
                  <tr key={client.id} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 relative">
                    <td className="px-6 py-5">
                      <Link href={`/dashboard/admin/clients/${client.id}`} className="flex items-center gap-3 group/link">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-purple-100 transition-transform group-hover/link:scale-110">
                          {client.companyName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1 group-hover/link:text-purple-700 transition-colors">
                            {client.companyName}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">Joined {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] font-bold">
                          {client.contactName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-xs">{client.contactName}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{client.contactEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 w-24">
                        <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-700 rounded-full" style={{ width: `${(client.activeProjects / (client.totalProjects || 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-900">{client.totalProjects}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{client.userCount} Users</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <ClientStatusMenu
                        clientId={client.id}
                        currentStatus={client.status}
                        companyName={client.companyName}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
