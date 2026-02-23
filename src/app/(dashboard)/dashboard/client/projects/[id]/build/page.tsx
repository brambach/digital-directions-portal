import { DigiMascot } from "@/components/digi-mascot";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags, releaseNotes, signoffs } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { DdFlagBanner } from "@/components/dd-flag-banner";
import { ClientFlagButton } from "@/components/client-flag-button";
import { BuildSpecSignoffBanner } from "@/components/build-spec-signoff-banner";
import { BuildSyncComponents, SYNC_COMPONENTS } from "@/components/build-sync-components";
import { deriveStageStatus } from "@/lib/lifecycle";
import { Clock, ArrowRight } from "lucide-react";
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

          {/* Digi header card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-5 px-6 py-5">
              <DigiMascot variant="construction" className="w-20 md:w-24 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-base leading-snug">
                  We&apos;re building your integration
                </h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Our team is hard at work. You&apos;ll see progress updates as each component is
                  completed below.
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  {lastUpdate
                    ? `Last update ${formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}`
                    : "No updates posted yet"}
                </div>
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

            {/* Scenario pills — mirror the three sync components using the same icons */}
            <div className="flex flex-wrap gap-2 pl-10">
              {SYNC_COMPONENTS.map(({ label, icon: Icon }) => (
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
