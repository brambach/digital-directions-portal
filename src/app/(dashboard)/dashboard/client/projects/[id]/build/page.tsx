import { DigiMascot } from "@/components/digi-mascot";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags, releaseNotes, signoffs, users } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { DdFlagBanner } from "@/components/dd-flag-banner";
import { ClientFlagButton } from "@/components/client-flag-button";
import { BuildSpecSignoffBanner } from "@/components/build-spec-signoff-banner";
import { BuildSyncComponents } from "@/components/build-sync-components";
import { Users, Calendar, FileText } from "lucide-react";
import { deriveStageStatus } from "@/lib/lifecycle";
import { Clock, ArrowRight, UserCircle2, PartyPopper } from "lucide-react";

const UAT_SCENARIOS = [
  { label: "Employee Upsert", icon: Users },
  { label: "Leave Request Sync", icon: Calendar },
  { label: "Pay Slip Upload", icon: FileText },
];
import { format, formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

function ProgressArc({ built, total }: { built: number; total: number }) {
  const r = 22;
  const cx = 28;
  const cy = 28;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? built / total : 0;
  const offset = circumference * (1 - pct);
  const allDone = built === total && total > 0;

  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="4" />
      {built > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={allDone ? "#10b981" : "#7C1CFF"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text
        x={cx}
        y={cy - 5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13"
        fontWeight="700"
        fill={allDone ? "#059669" : "#1E293B"}
      >
        {built}/{total}
      </text>
      <text
        x={cx}
        y={cy + 9}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fill="#94A3B8"
      >
        built
      </text>
    </svg>
  );
}

export default async function ClientBuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.clientId, user.clientId!),
        isNull(projects.deletedAt)
      )
    )
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("build", project.currentStage);

  const [flags, publishedNotes, buildSignoff] = await Promise.all([
    db
      .select()
      .from(clientFlags)
      .where(and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))),
    db
      .select()
      .from(releaseNotes)
      .where(and(eq(releaseNotes.projectId, id), isNotNull(releaseNotes.publishedAt)))
      .orderBy(desc(releaseNotes.publishedAt)),
    db
      .select()
      .from(signoffs)
      .where(and(eq(signoffs.projectId, id), eq(signoffs.type, "build_spec")))
      .limit(1),
  ]);

  const signoff = buildSignoff[0] ?? null;

  // Fetch assigned specialists (JSON array of user IDs)
  interface SpecialistProfile {
    name: string;
    avatarUrl: string | null;
  }
  const specialistIds: string[] = project.assignedSpecialists
    ? JSON.parse(project.assignedSpecialists)
    : [];

  let specialists: SpecialistProfile[] = [];
  if (specialistIds.length > 0) {
    const specialistDbUsers = await db
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(isNull(users.deletedAt));

    const matchedUsers = specialistDbUsers.filter((u) => specialistIds.includes(u.id));
    const clerk = await clerkClient();
    specialists = await Promise.all(
      matchedUsers.map(async (u) => {
        try {
          const clerkUser = await clerk.users.getUser(u.clerkId);
          return {
            name:
              `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
              clerkUser.emailAddresses[0]?.emailAddress ||
              "Specialist",
            avatarUrl: clerkUser.imageUrl ?? null,
          };
        } catch {
          return { name: "Integration Specialist", avatarUrl: null };
        }
      })
    );
  }

  const serializedNotes = publishedNotes.map((n) => ({
    ...n,
    publishedAt: n.publishedAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  const serializedSignoff = signoff
    ? {
        ...signoff,
        signedAt: signoff.signedAt?.toISOString() ?? null,
        ddCounterSignedAt: signoff.ddCounterSignedAt?.toISOString() ?? null,
        createdAt: signoff.createdAt.toISOString(),
      }
    : null;

  const lastUpdate = publishedNotes[0]?.publishedAt ?? null;
  const builtCount = [
    project.employeeUpsertStatus,
    project.leaveSyncStatus,
    project.paySlipStatus,
  ].filter((s) => s === "built").length;

  const allBuilt = builtCount === 3;

  const headline = allBuilt
    ? "Your integration is complete!"
    : builtCount > 0
    ? "Build is progressing well"
    : "We're building your integration";

  const subtext = allBuilt
    ? "All three sync components are built and ready. The final review and go-live are just ahead."
    : builtCount > 0
    ? "Our team has completed some components. More updates coming soon."
    : "Our team is hard at work. You'll see progress updates as each component is completed below.";

  return (
    <div className="min-h-full bg-[#F4F5F9] px-7 py-6 space-y-6">
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/client/projects"
      />

      <DdFlagBanner
        flags={flags.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
        projectId={id}
      />

      <StageCard
        stage="build"
        status={status}
        title="Integration Build"
        description="Track the progress of your integration and view updates from our team."
        isAdmin={false}
        projectId={id}
        backHref={`/dashboard/client/projects/${id}`}
      >
        <div className="space-y-6">

          {/* Sign-off banner — first thing seen when action is needed */}
          {serializedSignoff && !serializedSignoff.signedAt && status !== "locked" && (
            <BuildSpecSignoffBanner projectId={id} signoff={serializedSignoff} />
          )}

          {/* Celebration banner — all 3 built */}
          {allBuilt && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <PartyPopper className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Build complete!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  All components are built. Your team will be in touch shortly about next steps.
                </p>
              </div>
            </div>
          )}

          {/* Digi header card */}
          <div
            className={
              allBuilt
                ? "bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm overflow-hidden"
                : "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            }
          >
            <div className="flex items-center gap-5 px-6 py-5">
              <DigiMascot
                variant={allBuilt ? "celebrating" : "construction"}
                className="w-20 md:w-24 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3
                  className={
                    "font-bold text-base leading-snug " +
                    (allBuilt ? "text-emerald-800" : "text-slate-800")
                  }
                >
                  {headline}
                </h3>
                <p
                  className={
                    "text-sm mt-1 leading-relaxed " +
                    (allBuilt ? "text-emerald-700" : "text-slate-500")
                  }
                >
                  {subtext}
                </p>

                {/* Last update row */}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  {lastUpdate
                    ? `Last update ${formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}`
                    : "No updates posted yet"}
                </div>

                {/* Assigned specialists */}
                {specialists.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <UserCircle2 className="w-3.5 h-3.5 text-[#7C1CFF] flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap">
                      {specialists.map((s, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          {s.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.avatarUrl}
                              alt={s.name}
                              className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                            />
                          ) : null}
                          <span className="font-medium text-[#7C1CFF]">{s.name}</span>
                          {i < specialists.length - 1 && (
                            <span className="text-slate-300">·</span>
                          )}
                        </div>
                      ))}
                      <span className="text-slate-400 text-xs">
                        {specialists.length === 1
                          ? "· Integration Specialist"
                          : "· Integration Team"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <ProgressArc built={builtCount} total={3} />
            </div>
          </div>

          {/* Three sync component cards — portrait grid */}
          <BuildSyncComponents
            projectId={id}
            employeeUpsertStatus={project.employeeUpsertStatus}
            leaveSyncStatus={project.leaveSyncStatus}
            paySlipStatus={project.paySlipStatus}
            isAdmin={false}
            layout="grid"
          />

          {/* Build updates — full-width timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <h3 className="font-bold text-slate-900 text-sm">Build Updates</h3>
              {serializedNotes.length > 0 && (
                <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-semibold">
                  {serializedNotes.length}
                </span>
              )}
            </div>

            {serializedNotes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No updates yet — our team will post here as milestones are reached.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-100" />
                <div className="space-y-6">
                  {serializedNotes.map((note) => (
                    <div key={note.id} className="flex gap-4 relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7C1CFF] flex-shrink-0 mt-1.5 ring-4 ring-white relative z-10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold text-slate-800">{note.title}</p>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {format(new Date(note.publishedAt!), "d MMM yyyy")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Signed off confirmation */}
          {serializedSignoff?.signedAt && status !== "locked" && (
            <BuildSpecSignoffBanner projectId={id} signoff={serializedSignoff} />
          )}

          {/* What's next: UAT */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ArrowRight className="w-3.5 h-3.5 text-[#7C1CFF]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-violet-800">What&apos;s next: UAT</p>
                <p className="text-sm text-violet-700 mt-0.5 leading-relaxed">
                  Once the build is complete, you&apos;ll be invited to test the integration using
                  your real data. We&apos;ll guide you through every scenario — no technical
                  knowledge required.
                </p>
              </div>
            </div>

            {/* Scenario pills */}
            <div className="flex flex-wrap gap-2 pl-10">
              {UAT_SCENARIOS.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-violet-200 text-violet-700 shadow-sm"
                >
                  <Icon className="w-3 h-3 text-[#7C1CFF]" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Flag button */}
          {status !== "locked" && (
            <div className="flex justify-end pt-1 border-t border-slate-100">
              <ClientFlagButton projectId={id} />
            </div>
          )}
        </div>
      </StageCard>
    </div>
  );
}
