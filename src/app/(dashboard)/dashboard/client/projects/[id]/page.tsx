import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, messages, users, clientFlags } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Activity,
  HelpCircle,
  Plus,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { MessageForm } from "@/components/message-form";
import { clerkClient } from "@clerk/nextjs/server";
import { MessageList } from "@/components/message-list";
import { IntegrationHealthGrid } from "@/components/integration-health-grid";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { DdFlagBanner } from "@/components/dd-flag-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LIFECYCLE_STAGES,
  stageGuidance,
  stageSlug,
  stageIndex,
  stageLabel,
} from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const project = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.clientId, user.clientId!),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!project) {
    notFound();
  }

  // Fetch messages with sender details
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

  const clerkIds = [
    ...new Set(
      projectMessagesRaw.map((m) => m.senderClerkId).filter(Boolean)
    ),
  ] as string[];
  const clerk = await clerkClient();
  const clerkUsers =
    clerkIds.length > 0
      ? await Promise.all(
          clerkIds.map(async (cid) => {
            try {
              return await clerk.users.getUser(cid);
            } catch {
              return null;
            }
          })
        )
      : [];
  const clerkUserMap = new Map(
    clerkUsers
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  const projectMessages = projectMessagesRaw.map((message) => {
    const clerkUser = message.senderClerkId
      ? clerkUserMap.get(message.senderClerkId)
      : null;
    return {
      ...message,
      senderName: clerkUser
        ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "Team Member"
        : "Team Member",
      senderAvatar: clerkUser?.imageUrl || null,
    };
  });

  // Fetch unresolved flags
  const flags = await db
    .select()
    .from(clientFlags)
    .where(
      and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))
    );

  const now = new Date();
  const daysLeft = project.dueDate
    ? differenceInDays(new Date(project.dueDate), now)
    : null;

  // Current stage guidance
  const currentStageIdx = stageIndex(project.currentStage);
  const guidance = stageGuidance(project.currentStage);
  const currentSlug = stageSlug(project.currentStage);

  // Build quick links for unlocked stages
  const unlockedStages = LIFECYCLE_STAGES.filter((s, i) => {
    return i <= currentStageIdx && s.slug !== null;
  });

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/client/projects"
              className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                Project
              </p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {project.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/client/tickets">
              <Button size="sm" className="rounded-full font-semibold bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200 shadow-none">
                <HelpCircle className="w-4 h-4 mr-2" />
                Get Support
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">
        {/* Lifecycle Stepper */}
        <LifecycleStepper
          currentStage={project.currentStage}
          projectId={id}
          basePath="/dashboard/client/projects"
        />

        {/* Flag banners */}
        <DdFlagBanner
          flags={flags.map((f) => ({
            ...f,
            createdAt: f.createdAt.toISOString(),
          }))}
          projectId={id}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column — Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Current Step Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-[#7C1CFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#7C1CFF] uppercase tracking-widest mb-1">
                    Your Current Step
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">
                    {guidance.title}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {guidance.description}
                  </p>
                  {currentSlug && (
                    <Link
                      href={`/dashboard/client/projects/${id}/${currentSlug}`}
                    >
                      <Button size="sm" className="rounded-full mt-4">
                        Go to {stageLabel(project.currentStage)}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Links to Unlocked Stages */}
            {unlockedStages.length > 1 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-[13px] font-bold text-slate-800 mb-4">
                  Stage Overview
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unlockedStages.map((stage) => {
                    const isActive = stage.key === project.currentStage;
                    const isComplete =
                      stageIndex(stage.key) < currentStageIdx;
                    return (
                      <Link
                        key={stage.key}
                        href={`/dashboard/client/projects/${id}/${stage.slug}`}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm",
                          isActive
                            ? "border-[#7C1CFF] bg-violet-50"
                            : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            isComplete
                              ? "bg-[#7C1CFF] text-white"
                              : isActive
                              ? "bg-violet-100 text-[#7C1CFF]"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {isComplete ? "✓" : stageIndex(stage.key) + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              isActive ? "text-[#7C1CFF]" : "text-slate-700"
                            )}
                          >
                            {stage.label}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isComplete
                              ? "Complete"
                              : isActive
                              ? "In progress"
                              : "Available"}
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            "w-4 h-4",
                            isActive ? "text-[#7C1CFF]" : "text-slate-300"
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* System Health */}
            <div>
              <div className="flex items-center gap-2.5 mb-4 px-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Activity
                    className="w-4 h-4 text-emerald-600"
                    strokeWidth={2}
                  />
                </div>
                <h2 className="text-[15px] font-bold text-slate-800">
                  System Health
                </h2>
              </div>
              <IntegrationHealthGrid
                clientId={project.clientId}
                projectId={id}
              />
            </div>
          </div>

          {/* Right Column — Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Target Delivery */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Calendar
                    className="w-4 h-4 text-violet-600"
                    strokeWidth={2}
                  />
                </div>
                <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest">
                  Target Delivery
                </p>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {project.dueDate
                  ? format(new Date(project.dueDate), "MMM d, yyyy")
                  : "TBD"}
              </p>
              {daysLeft !== null && (
                <p
                  className={cn(
                    "text-[12px] font-semibold mt-1",
                    daysLeft < 0 ? "text-red-600" : "text-emerald-600"
                  )}
                >
                  {daysLeft < 0
                    ? `${Math.abs(daysLeft)} days overdue`
                    : `${daysLeft} days remaining`}
                </p>
              )}
            </div>

            {/* Project Chat */}
            <div>
              <div className="flex items-center gap-2.5 mb-4 px-1">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                  <MessageSquare
                    className="w-4 h-4 text-sky-600"
                    strokeWidth={2}
                  />
                </div>
                <h2 className="text-[15px] font-bold text-slate-800">
                  Project Chat
                </h2>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                  <MessageList
                    projectId={id}
                    initialMessages={projectMessages}
                  />
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <MessageForm projectId={id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
