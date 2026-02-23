import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags, releaseNotes, signoffs } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { AdminFlagSection } from "@/components/admin-flag-section";
import { ReleaseNoteEditor } from "@/components/release-note-editor";
import { BuildSpecPublishDialog } from "@/components/build-spec-publish-dialog";
import { BuildSyncComponents } from "@/components/build-sync-components";
import { deriveStageStatus } from "@/lib/lifecycle";
import { ClipboardCheck, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminBuildPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("build", project.currentStage);

  const [unresolvedFlags, allNotes, buildSignoff] = await Promise.all([
    db
      .select()
      .from(clientFlags)
      .where(and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))),
    db
      .select()
      .from(releaseNotes)
      .where(eq(releaseNotes.projectId, id))
      .orderBy(desc(releaseNotes.createdAt)),
    db
      .select()
      .from(signoffs)
      .where(and(eq(signoffs.projectId, id), eq(signoffs.type, "build_spec")))
      .limit(1),
  ]);

  const signoff = buildSignoff[0] ?? null;

  const serializedNotes = allNotes.map((n) => ({
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

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-6 lg:p-10 space-y-6">
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/admin/projects"
      />

      <StageCard
        stage="build"
        status={status}
        title="Integration Build"
        description="Track sync component progress, publish build updates, and manage the build spec sign-off."
        isAdmin={true}
        projectId={id}
        backHref={`/dashboard/admin/projects/${id}`}
      >
        <div className="space-y-8">
          {/* Build Spec Sign-Off Status */}
          {signoff?.signedAt ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Build Spec Signed Off</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Client signed on {format(new Date(signoff.signedAt), "d MMM yyyy")}
                    {signoff.ddCounterSignedAt &&
                      ` · Counter-signed ${format(new Date(signoff.ddCounterSignedAt), "d MMM yyyy")}`}
                  </p>
                </div>
              </div>
              <BuildSpecPublishDialog projectId={id} existingSignoff={serializedSignoff} />
            </div>
          ) : signoff ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Awaiting Client Sign-Off</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Build spec published {format(new Date(signoff.createdAt), "d MMM yyyy")} · Waiting for client to sign
                  </p>
                </div>
              </div>
              <BuildSpecPublishDialog projectId={id} existingSignoff={serializedSignoff} />
            </div>
          ) : null}

          {/* Sync Components */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Sync Components</h3>
              {!signoff && (
                <BuildSpecPublishDialog projectId={id} existingSignoff={serializedSignoff} />
              )}
            </div>
            <BuildSyncComponents
              projectId={id}
              employeeUpsertStatus={project.employeeUpsertStatus}
              leaveSyncStatus={project.leaveSyncStatus}
              paySlipStatus={project.paySlipStatus}
              isAdmin={true}
            />
          </div>

          {/* Release Notes */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <ReleaseNoteEditor
              projectId={id}
              notes={serializedNotes}
            />
          </div>

          {/* Flags */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <AdminFlagSection
              projectId={id}
              flags={unresolvedFlags.map((f) => ({
                ...f,
                createdAt: f.createdAt.toISOString(),
              }))}
            />
          </div>
        </div>
      </StageCard>
    </div>
  );
}
