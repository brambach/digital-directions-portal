import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, messages, users } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MessageSquare, Activity, HelpCircle, Plus, CheckCircle, AlertCircle, Layout } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { MessageForm } from "@/components/message-form";
import { clerkClient } from "@clerk/nextjs/server";
import { MessageList } from "@/components/message-list";
import { ProjectPhaseManager } from "@/components/project-phase-manager";
import { IntegrationHealthGrid } from "@/components/integration-health-grid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!project) {
    notFound();
  }

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

  const clerkIds = [...new Set(projectMessagesRaw.map((m) => m.senderClerkId).filter(Boolean))] as string[];
  const clerk = await clerkClient();
  const clerkUsers = clerkIds.length > 0 ? await Promise.all(clerkIds.map(async (cid) => { try { return await clerk.users.getUser(cid); } catch { return null; } })) : [];
  const clerkUserMap = new Map(clerkUsers.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => [u.id, u]));

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

  const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
    planning: { color: "bg-violet-50 text-violet-700", label: "Planning Phase", icon: Layout },
    in_progress: { color: "bg-emerald-50 text-emerald-700", label: "In Active Development", icon: Activity },
    review: { color: "bg-amber-50 text-amber-700", label: "Under Review", icon: CheckCircle },
    completed: { color: "bg-slate-100 text-slate-600", label: "Project Completed", icon: CheckCircle },
    on_hold: { color: "bg-red-50 text-red-700", label: "On Hold", icon: AlertCircle },
  };

  const currentStatus = statusConfig[project.status] || statusConfig.planning;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/client/projects" className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Project</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", currentStatus.color)}>
              <StatusIcon className="w-3.5 h-3.5" />
              {currentStatus.label}
            </span>
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">
        {/* Top Row: Project Info + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Project Info */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6">
            <p className="text-slate-500 text-[14px] leading-relaxed mb-6">
              {project.description || "We are actively working on your deliverables. Track real-time progress and milestones below."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/client/tickets">
                <Button size="sm" className="rounded-xl font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Request Change
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

          {/* Stats Sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-violet-600" strokeWidth={2} />
                </div>
                <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest">Target Delivery</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "TBD"}
              </p>
              {daysLeft !== null && (
                <p className={cn("text-[12px] font-semibold mt-1", daysLeft < 0 ? "text-red-600" : "text-emerald-600")}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-sky-600" strokeWidth={2} />
                </div>
                <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest">Team Updates</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{projectMessages.length}</p>
              <p className="text-[12px] text-slate-400 mt-1">Recent communications</p>
            </div>
          </div>
        </div>

        {/* Bottom Row: Roadmap + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">
            {/* Phase Manager */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-600" strokeWidth={2} />
                </div>
                <h2 className="text-[15px] font-bold text-slate-800">Roadmap Progress</h2>
              </div>
              <ProjectPhaseManager projectId={id} isAdmin={false} />
            </div>

            {/* System Health */}
            <div>
              <div className="flex items-center gap-2.5 mb-4 px-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                </div>
                <h2 className="text-[15px] font-bold text-slate-800">System Health</h2>
              </div>
              <IntegrationHealthGrid clientId={project.clientId} projectId={id} />
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5 mb-4 px-1">
              <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-sky-600" strokeWidth={2} />
              </div>
              <h2 className="text-[15px] font-bold text-slate-800">Project Chat</h2>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-[700px]">
              <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                <MessageList projectId={id} initialMessages={projectMessages} />
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <MessageForm projectId={id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
