import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, files } from "@/lib/db/schema";
import { isNull, and, gte, sql } from "drizzle-orm";
import { Users, FolderKanban, FileUp } from "lucide-react";
import { InviteTeamMemberDialog } from "@/components/invite-team-member-dialog";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  // Fetch real stats
  const [clientStats, projectStats, fileStats] = await Promise.all([
    // Total clients
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(isNull(clients.deletedAt))
      .then((rows) => rows[0]?.count || 0),

    // Active projects (in_progress, planning, review)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(
        and(
          isNull(projects.deletedAt),
          sql`${projects.status} IN ('in_progress', 'planning', 'review')`
        )
      )
      .then((rows) => rows[0]?.count || 0),

    // Total files uploaded
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(files)
      .then((rows) => rows[0]?.count || 0),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage client projects, track engagement, and oversee support operations.</p>
        </div>
        <InviteTeamMemberDialog />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Clients */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Clients</span>
            <Users className="text-gray-400 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{clientStats}</div>
        </div>

        {/* Active Projects */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Active Projects</span>
            <FolderKanban className="text-purple-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{projectStats}</div>
        </div>

        {/* Files Uploaded */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Files Uploaded</span>
            <FileUp className="text-green-500 w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-semibold text-gray-900 tracking-tight">{fileStats}</div>
        </div>
      </div>

      {/* Placeholder for future sections */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500 text-sm">
          Foundation setup complete with real data. Recent activity feed coming soon.
        </p>
      </div>
    </div>
  );
}
