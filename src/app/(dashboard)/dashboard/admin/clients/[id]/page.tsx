import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects, clientActivity, users, invites } from "@/lib/db/schema";
import { eq, isNull, and, gt, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Building2, Calendar, Activity as ActivityIcon, FolderOpen, CheckCircle, AlertCircle, Clock, User, Users as UsersIcon, MailCheck, LayoutGrid, FileText, Briefcase, Zap, MoreHorizontal, ChevronDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import dynamicImport from "next/dynamic";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { SupportHoursCard } from "@/components/support-hours-card";
import { clerkClient } from "@clerk/nextjs/server";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DigiMascot } from "@/components/digi-mascot";

// Lazy load dialogs
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
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Active" };
    case "inactive":
      return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", label: "Inactive" };
    case "archived":
      return { bg: "bg-white", text: "text-slate-500", border: "border-slate-200", label: "Archived" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", label: status };
  }
}

// Helper function to get project status badge
function getProjectStatusBadge(status: string): { bg: string; text: string; dot: string; label: string } {
  switch (status) {
    case "in_progress":
      return { bg: "bg-violet-50", text: "text-[#7C1CFF]", dot: "bg-[#7C1CFF]", label: "In Progress" };
    case "review":
      return { bg: "bg-violet-50", text: "text-[#7C1CFF]", dot: "bg-[#7C1CFF]", label: "In Review" };
    case "completed":
      return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" };
    case "on_hold":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "On Hold" };
    case "planning":
      return { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", label: "Planning" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: status };
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
    .orderBy(desc(projects.createdAt));

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

  // Fetch admin users for the specialist selector in AddProjectDialog
  const adminDbUsers = await db
    .select({ id: users.id, clerkId: users.clerkId })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

  const clerkForAdmins = await clerkClient();
  const adminUsers = await Promise.all(
    adminDbUsers.map(async (u) => {
      try {
        const cu = await clerkForAdmins.users.getUser(u.clerkId);
        return {
          id: u.id,
          name: `${cu.firstName || ""} ${cu.lastName || ""}`.trim() || cu.emailAddresses[0]?.emailAddress || "Admin",
          email: cu.emailAddresses[0]?.emailAddress || "",
        };
      } catch {
        return { id: u.id, name: "Admin", email: "" };
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

  const statusBadge = getStatusBadge(client.status);

  // Custom Work Item Component for timeline look
  const ActivityItem = ({ color, title, time }: { color: string; title: string; time: string }) => (
    <div className="relative pl-6 pb-6 border-l border-slate-100 last:border-l-0 last:pb-0">
      <div className={cn("absolute -left-1.5 top-0 w-3 h-3 rounded-full ring-4 ring-white", color)}></div>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-900">{title}</span>
        <span className="text-[10px] text-slate-400 mt-1">{time}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] no-scrollbar">
      <AnimateOnScroll />

      {/* Page Header — Pattern A with back nav */}
      <div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
        <Link
          href="/dashboard/admin/clients"
          className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Clients
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{client.companyName}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
            >
              {statusBadge.label}
            </span>
          </div>
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
        <div className="flex flex-wrap items-center gap-6 mt-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700">{client.contactName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail className="w-4 h-4 text-slate-400" />
            <a href={`mailto:${client.contactEmail}`} className="hover:text-[#7C1CFF] transition-colors">
              {client.contactEmail}
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>Since {format(new Date(client.createdAt), "MMM yyyy")}</span>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats Grid — inline stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter delay-100">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 mb-1">Total Projects</p>
            <p className="text-2xl font-bold text-slate-900">{totalProjects}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 mb-1">Active Projects</p>
            <p className="text-2xl font-bold text-slate-900">{activeProjects}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-slate-900">{completedProjects}</p>
          </div>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-12 gap-6 pb-8">

          {/* Left Column (Projects Table) */}
          <div className="col-span-12 lg:col-span-8 animate-enter delay-200">
            <Card className="border-slate-100 shadow-sm rounded-xl h-full">
              <div className="p-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <Briefcase className="w-3.5 h-3.5" />
                  Projects
                </div>
                <AddProjectDialog clients={[{ id: client.id, companyName: client.companyName }]} admins={adminUsers} />
              </div>

              {clientProjects.length === 0 ? (
                <div className="py-16 text-center">
                  <DigiMascot variant="neutral" size="sm" className="mb-3 mx-auto" />
                  <p className="text-sm font-medium text-slate-700">No projects yet</p>
                  <p className="text-xs text-slate-400 mt-1">Create a new project to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-50 bg-slate-50/30">
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest pl-8">Project Name</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Due Date</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-right pr-8">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {clientProjects.map((project) => {
                        const status = getProjectStatusBadge(project.status);
                        const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

                        return (
                          <tr key={project.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                            <td className="px-6 py-5 pl-8">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 group-hover:text-[#7C1CFF] transition-colors">{project.name}</span>
                                <span className="text-xs text-slate-400 truncate max-w-[200px]">{project.description || "No description"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", status.dot)}></div>
                                <span className="font-medium text-slate-700">{status.label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              {project.dueDate ? (
                                <div className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-bold", isOverdue ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500")}>
                                  <Clock className="w-3 h-3 mr-1.5" />
                                  {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No deadline</span>
                              )}
                            </td>
                            <td className="px-6 py-5 pr-8 text-right">
                              <Link href={`/dashboard/admin/projects/${project.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" aria-label="Project options">
                                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="col-span-12 lg:col-span-4 space-y-6 animate-enter delay-300">

            {/* Support Hours */}
            <Card className="p-6 border-slate-100 shadow-sm rounded-xl">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Support Hours
                </div>
                <div className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:bg-slate-100">
                  Monthly
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
              <div className="-mx-6 px-6">
                <SupportHoursCard clientId={client.id} isAdmin={true} />
              </div>
            </Card>

            {/* Portal Users */}
            <Card className="p-6 border-slate-100 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <UsersIcon className="w-3.5 h-3.5" />
                  Portal Team
                </div>
                <InviteUserToClientDialog clientId={client.id} companyName={client.companyName} />
              </div>

              <div className="space-y-4">
                {portalUsersWithDetails.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-50 to-white border border-violet-100 flex items-center justify-center text-[#7C1CFF] font-bold text-xs shadow-sm">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate uppercase">{user.role}</p>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-full">Active</div>
                  </div>
                ))}

                {portalUsersWithDetails.length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-4">No active users</p>
                )}

                {pendingInvites.length > 0 && (
                  <div className="pt-4 mt-2 border-t border-slate-50">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Pending Invites</p>
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center gap-3 mb-3 last:mb-0 opacity-70">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{invite.email}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Expires {formatDistanceToNow(new Date(invite.expiresAt))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6 border-slate-100 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <ActivityIcon className="w-3.5 h-3.5" />
                  Recent Activity
                </div>
              </div>

              <div className="pl-2">
                <ActivityItem
                  color="bg-emerald-500"
                  title="Last Login"
                  time={activity?.lastLogin ? formatDistanceToNow(new Date(activity.lastLogin), { addSuffix: true }) : "Never"}
                />
                <ActivityItem
                  color="bg-[#7C1CFF]"
                  title="Last Message Sent"
                  time={activity?.lastMessageSent ? formatDistanceToNow(new Date(activity.lastMessageSent), { addSuffix: true }) : "No messages"}
                />
                <ActivityItem
                  color="bg-slate-400"
                  title="Last File Download"
                  time={activity?.lastFileDownloaded ? formatDistanceToNow(new Date(activity.lastFileDownloaded), { addSuffix: true }) : "No downloads"}
                />
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
