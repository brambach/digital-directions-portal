import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, clientActivity, users, invites } from "@/lib/db/schema";
import { eq, isNull, and, gt, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Building2, Calendar, Activity as ActivityIcon, FolderOpen, CheckCircle, AlertCircle, Clock, User, Users as UsersIcon, MailCheck, LayoutGrid, FileText } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import dynamicImport from "next/dynamic";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { SupportHoursCard } from "@/components/support-hours-card";
import { clerkClient } from "@clerk/nextjs/server";

const AddProjectDialog = dynamicImport(
  () => import("@/components/add-project-dialog").then((mod) => ({ default: mod.AddProjectDialog })),
  { loading: () => null }
);
const InviteUserToClientDialog = dynamicImport(
  () => import("@/components/invite-user-to-client-dialog").then((mod) => ({ default: mod.InviteUserToClientDialog })),
  { loading: () => null }
);
const EditClientDialog = dynamicImport(
  () => import("@/components/edit-client-dialog").then((mod) => ({ default: mod.EditClientDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

// Helper function to get status badge styles
function getStatusBadge(status: string): { bg: string; text: string; border: string; label: string } {
  switch (status) {
    case "active":
      return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Active" };
    case "inactive":
      return { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: "Inactive" };
    case "archived":
      return { bg: "bg-white", text: "text-slate-400", border: "border-slate-200", label: "Archived" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: status };
  }
}

// Helper function to get project status badge
function getProjectStatusBadge(status: string): { bg: string; text: string; border: string; label: string } {
  switch (status) {
    case "in_progress":
      return { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", label: "In Progress" };
    case "review":
      return { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", label: "In Review" };
    case "completed":
      return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Completed" };
    case "on_hold":
      return { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", label: "On Hold" };
    case "planning":
      return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", label: "Planning" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: status };
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

  // Fetch portal users for this client
  const portalUsers = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.clientId, id), isNull(users.deletedAt)))
    .orderBy(users.createdAt);

  // Fetch Clerk user data for portal users
  const portalUsersWithDetails = await Promise.all(
    portalUsers.map(async (user) => {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(user.clerkId);
        return {
          ...user,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Unknown User",
          email: clerkUser.emailAddresses[0]?.emailAddress || "No email",
        };
      } catch (error) {
        console.error(`Error fetching Clerk user ${user.clerkId}:`, error);
        return {
          ...user,
          name: "Unknown User",
          email: "No email",
        };
      }
    })
  );

  // Fetch pending invites for this client
  const pendingInvites = await db
    .select({
      id: invites.id,
      email: invites.email,
      expiresAt: invites.expiresAt,
      createdAt: invites.createdAt,
    })
    .from(invites)
    .where(
      and(
        eq(invites.clientId, id),
        eq(invites.status, "pending"),
        gt(invites.expiresAt, new Date())
      )
    )
    .orderBy(invites.createdAt);

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
    <>
      <AnimateOnScroll />
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 md:py-12">
        {/* Back Button */}
        <Link
          href="/dashboard/admin/clients"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors [animation:animationIn_0.5s_ease-out_0s_both] animate-on-scroll"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>

        {/* Client Header */}
        <div className="bg-white p-6 rounded-2xl mb-8 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] [animation:animationIn_0.5s_ease-out_0.1s_both] animate-on-scroll">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-medium text-slate-900 tracking-tight">{client.companyName}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium text-slate-700">{client.contactName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${client.contactEmail}`} className="hover:text-indigo-600 transition-colors">
                    {client.contactEmail}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  Client since {format(new Date(client.createdAt), "MMMM d, yyyy")}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <EditClientDialog
                client={{
                  id: client.id,
                  companyName: client.companyName,
                  contactName: client.contactName,
                  contactEmail: client.contactEmail,
                  status: client.status,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] [animation:animationIn_0.5s_ease-out_0.2s_both] animate-on-scroll">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Total Projects</span>
              <FolderOpen className="text-slate-400 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-medium text-slate-900 tracking-tight">{totalProjects}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.05)] [animation:animationIn_0.5s_ease-out_0.3s_both] animate-on-scroll">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-widest">Active</span>
              <Clock className="text-indigo-500 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-medium text-slate-900 tracking-tight">{activeProjects}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.05)] [animation:animationIn_0.5s_ease-out_0.4s_both] animate-on-scroll">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">Completed</span>
              <CheckCircle className="text-emerald-500 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-medium text-slate-900 tracking-tight">{completedProjects}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.05)] [animation:animationIn_0.5s_ease-out_0.5s_both] animate-on-scroll">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-red-600 uppercase tracking-widest">Overdue</span>
              <AlertCircle className="text-red-500 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-medium text-slate-900 tracking-tight">{overdueProjects}</div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 [animation:animationIn_0.5s_ease-out_0.6s_both] animate-on-scroll">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Projects</h2>
              </div>
              <AddProjectDialog clients={[{ id: client.id, companyName: client.companyName }]} />
            </div>

            {clientProjects.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] [animation:animationIn_0.5s_ease-out_0.7s_both] animate-on-scroll">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-slate-500 text-sm">No projects yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientProjects.map((project, index) => {
                  const projectStatus = getProjectStatusBadge(project.status);
                  const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/admin/projects/${project.id}`}
                      className="block bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 group animate-on-scroll"
                      style={{ animation: `animationIn 0.5s ease-out ${0.7 + index * 0.1}s both` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {project.description || "No description"}
                          </p>
                          {project.dueDate && (
                            <p className={`text-xs mt-2 ${isOverdue ? "text-red-600 font-medium" : "text-slate-400"}`}>
                              Due {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${projectStatus.bg} ${projectStatus.text} border ${projectStatus.border} whitespace-nowrap`}
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

        {/* Grid Layout for Other Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Portal Users */}
          <div className="[animation:animationIn_0.5s_ease-out_0.7s_both] animate-on-scroll">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Portal Users</h2>
              </div>
              <InviteUserToClientDialog clientId={client.id} companyName={client.companyName} />
            </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                {portalUsersWithDetails.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-sm text-slate-500 mb-4">No portal users yet</p>
                    <p className="text-xs text-slate-400">
                      Invite users from {client.companyName} to give them access to projects and files.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                      <UsersIcon className="w-4 h-4" />
                      <span className="font-medium">{portalUsersWithDetails.length} user{portalUsersWithDetails.length > 1 ? "s" : ""}</span>
                    </div>
                    {portalUsersWithDetails.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200">
                          <User className="w-4 h-4 text-purple-600" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {user.email}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>

          {/* Support Hours */}
          <div className="[animation:animationIn_0.5s_ease-out_0.8s_both] animate-on-scroll">
            <div className="flex items-center gap-3 mb-4">
              <LayoutGrid className="w-4 h-4 text-indigo-500" />
              <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Support Hours</h2>
            </div>
            <SupportHoursCard clientId={client.id} isAdmin={true} />
          </div>

          {/* Activity */}
          <div className="[animation:animationIn_0.5s_ease-out_1.0s_both] animate-on-scroll">
            <div className="flex items-center gap-3 mb-4">
              <LayoutGrid className="w-4 h-4 text-indigo-500" />
              <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Activity</h2>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <ActivityIcon className="w-4 h-4" />
                    <span className="font-medium">Last Login</span>
                  </div>
                  <p className="text-sm text-slate-700 ml-6">
                    {activity?.lastLogin
                      ? formatDistanceToNow(new Date(activity.lastLogin), { addSuffix: true })
                      : "Never"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Last Message</span>
                  </div>
                  <p className="text-sm text-slate-700 ml-6">
                    {activity?.lastMessageSent
                      ? formatDistanceToNow(new Date(activity.lastMessageSent), { addSuffix: true })
                      : "No messages yet"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">Last File Download</span>
                  </div>
                  <p className="text-sm text-slate-700 ml-6">
                    {activity?.lastFileDownloaded
                      ? formatDistanceToNow(new Date(activity.lastFileDownloaded), { addSuffix: true })
                      : "No downloads yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div className="[animation:animationIn_0.5s_ease-out_0.9s_both] animate-on-scroll lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <LayoutGrid className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Pending Invites</h2>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                      <MailCheck className="w-4 h-4" />
                      <span className="font-medium">{pendingInvites.length} pending invite{pendingInvites.length > 1 ? "s" : ""}</span>
                    </div>
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center border border-yellow-200">
                          <Clock className="w-4 h-4 text-yellow-600" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">
                            {invite.email}
                          </p>
                          <p className="text-xs text-slate-400">
                            Sent {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })} • Expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-slate-400 mt-2">
                      These users have been invited but haven&apos;t signed up yet. Invites expire after 7 days.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}
