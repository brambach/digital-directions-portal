import { DigiMascot } from "@/components/digi-mascot";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projects,
  clientFlags,
  releaseNotes,
  signoffs,
} from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { DdFlagBanner } from "@/components/dd-flag-banner";
import { ClientFlagButton } from "@/components/client-flag-button";
import { BuildSpecSignoffBanner } from "@/components/build-spec-signoff-banner";
import { BuildSyncComponents } from "@/components/build-sync-components";
import { ReleaseNoteCard } from "@/components/release-note-card";
import { deriveStageStatus } from "@/lib/lifecycle";
import { FileText, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

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
      .where(
        and(eq(releaseNotes.projectId, id), isNotNull(releaseNotes.publishedAt))
      )
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

  // Last update = most recent published release note
  const lastUpdate = publishedNotes[0]?.publishedAt ?? null;

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
        description="Track the progress of your integration build and view updates from our team."
        isAdmin={false}
        projectId={id}
        backHref={`/dashboard/client/projects/${id}`}
      >
        <div className="space-y-8">
          {/* Hero */}
          <div className="flex flex-col items-center text-center py-6 border-b border-slate-100">
            <DigiMascot variant="construction" className="w-40 md:w-52 mb-5" />
            <h3 className="text-base font-bold text-slate-800 mb-1.5">
              We&apos;re building your integration
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Our team is hard at work. You&apos;ll see progress updates here as each part of your integration is completed.
            </p>
            {lastUpdate && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                Last update {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}
              </div>
            )}
          </div>

          {/* Build Spec Sign-Off */}
          {serializedSignoff && status !== "locked" && (
            <BuildSpecSignoffBanner projectId={id} signoff={serializedSignoff} />
          )}

          {/* Sync Components (read-only) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Your Integration</h3>
            <BuildSyncComponents
              projectId={id}
              employeeUpsertStatus={project.employeeUpsertStatus}
              leaveSyncStatus={project.leaveSyncStatus}
              paySlipStatus={project.paySlipStatus}
              isAdmin={false}
            />
          </div>

          {/* Build Updates Feed */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7C1CFF]" />
              <h3 className="font-bold text-slate-900 text-sm">Build Updates</h3>
              {serializedNotes.length > 0 && (
                <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-semibold">
                  {serializedNotes.length}
                </span>
              )}
            </div>

            {serializedNotes.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">No updates yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Our team will post updates here as parts of your integration are completed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {serializedNotes.map((note) => (
                  <ReleaseNoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </div>

          {/* What's next */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ArrowRight className="w-3.5 h-3.5 text-[#7C1CFF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-800">What&apos;s next: UAT</p>
              <p className="text-sm text-violet-700 mt-0.5">
                Once the build is complete, you&apos;ll be invited to test the integration using your real data. We&apos;ll guide you through every scenario — no technical knowledge required.
              </p>
            </div>
          </div>

          {/* Flag button */}
          {status !== "locked" && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <ClientFlagButton projectId={id} />
            </div>
          )}
        </div>
      </StageCard>
    </div>
  );
}
