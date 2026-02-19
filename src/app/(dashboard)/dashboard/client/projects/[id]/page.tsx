import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, messages, users, integrationMonitors } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MessageSquare, Clock, Activity, HelpCircle, Ticket, AlertCircle, Layout, Plus, ArrowUpRight, TrendingUp, CheckCircle, ChevronRight, Play } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { MessageForm } from "@/components/message-form";
import { clerkClient } from "@clerk/nextjs/server";
import { MessageList } from "@/components/message-list";
import { ContactTeamButton } from "@/components/contact-team-button";
import { ProjectPhaseManager } from "@/components/project-phase-manager";
import { IntegrationHealthGrid } from "@/components/integration-health-grid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export const dynamic = "force-dynamic";

export default async function ClientProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  // Fetch project
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!project) {
    notFound();
  }

  // Fetch messages
  const projectMessagesRaw = await db
    .select({
      id: messages.id,
      content: messages.content,
      read: messages.read,
      createdAt: messages.createdAt,
      senderId: messages.senderId,
      senderClerkId: users.clerkId,
      senderRole: users.role,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.projectId, id), isNull(messages.deletedAt)))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  // Fetch Clerk user info
  const clerkIds = [...new Set(projectMessagesRaw.map((m) => m.senderClerkId).filter(Boolean))] as string[];
  const clerk = await clerkClient();
  const clerkUsers = clerkIds.length > 0 ? await Promise.all(clerkIds.map(async (id) => { try { return await clerk.users.getUser(id); } catch { return null; } })) : [];
  const clerkUserMap = new Map(clerkUsers.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => [u.id, u]));

  // Enrich messages
  const projectMessages = projectMessagesRaw.map((message) => {
    const clerkUser = message.senderClerkId ? clerkUserMap.get(message.senderClerkId) : null;
    return {
      ...message,
      senderName: clerkUser ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Team Member" : "Team Member",
      senderAvatar: clerkUser?.imageUrl || null,
    };
  });

  const now = new Date();
  const daysLeft = project.dueDate ? differenceInDays(new Date(project.dueDate), now) : null;

  // Status styling
  const statusConfig: any = {
    planning: { color: "bg-purple-50 text-purple-700", label: "Planning Phase", icon: Layout },
    in_progress: { color: "bg-emerald-50 text-emerald-600", label: "In Active Development", icon: Activity },
    review: { color: "bg-amber-50 text-amber-600", label: "Under Review", icon: CheckCircle },
    completed: { color: "bg-gray-50 text-gray-600", label: "Project Completed", icon: CheckCircle },
    on_hold: { color: "bg-red-50 text-red-600", label: "On Hold", icon: AlertCircle },
  };

  const currentStatus = statusConfig[project.status] || statusConfig.planning;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F4F7] p-6 lg:p-10 space-y-6 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Back & Breadcrumb */}
      <div className="flex items-center gap-2 animate-enter delay-100">
        <Link href="/dashboard/client/projects" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm text-gray-400 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-gray-400 font-bold text-sm">/ {project.name}</span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Hero (Left) */}
        <div className="col-span-12 lg:col-span-8 animate-enter delay-200">
          <div className="bg-white rounded-xl p-8 lg:p-10 shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4", currentStatus.color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {currentStatus.label}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-3">
                    {project.name}
                  </h1>
                  <p className="text-gray-500 text-base max-w-xl">
                    {project.description || "We are actively working on your deliverables. Track real-time progress and milestones below."}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-700 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-200">
                    {project.name.charAt(0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Area */}
            <div className="flex flex-wrap gap-3 items-center mt-8">
              <Link href="/dashboard/client/tickets">
                <Button size="sm" className="rounded-xl font-semibold shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Request Project Change
                </Button>
              </Link>
              <Link href="/dashboard/client/tickets">
                <Button variant="outline" size="sm" className="rounded-xl font-semibold">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Get Support
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar Stats (Right) */}
        <div className="col-span-12 lg:col-span-4 space-y-6 animate-enter delay-300">
          {/* Due Date Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Delivery</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "TBD"}
            </h3>
            {daysLeft !== null && (
              <p className={cn("text-xs font-semibold", daysLeft < 0 ? "text-red-500" : "text-emerald-500")}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)} Days Overdue` : `${daysLeft} Days Remaining`}
              </p>
            )}
          </div>

          {/* Team Activity Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team Updates</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{projectMessages.length}</h3>
            <p className="text-sm text-gray-500">Recent communications</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 animate-enter delay-400">
        {/* Roadmap & Integrations */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Phase Manager */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Roadmap Progress</h3>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <ProjectPhaseManager projectId={id} isAdmin={false} />
            </div>
          </section>

          {/* System Health */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">System Health</h3>
            </div>
            <IntegrationHealthGrid clientId={project.clientId} projectId={id} />
          </section>
        </div>

        {/* Chat / Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <section className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Project Chat</h3>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px] border border-gray-100">
              <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                <MessageList projectId={id} initialMessages={projectMessages} />
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <MessageForm projectId={id} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
