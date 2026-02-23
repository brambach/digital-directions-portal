import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, goLiveChecklist, goLiveEvents, clientFlags } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { AdminFlagSection } from "@/components/admin-flag-section";
import { AdminGoLiveContent } from "@/components/admin-go-live-content";
import { deriveStageStatus } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function AdminGoLivePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("go_live", project.currentStage);

  const [checklistRows, eventRows, unresolvedFlags] = await Promise.all([
    db
      .select()
      .from(goLiveChecklist)
      .where(eq(goLiveChecklist.projectId, id))
      .limit(1),
    db
      .select()
      .from(goLiveEvents)
      .where(eq(goLiveEvents.projectId, id))
      .limit(1),
    db
      .select()
      .from(clientFlags)
      .where(and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))),
  ]);

  const checklist = checklistRows[0] ?? null;
  const goLiveEvent = eventRows[0] ?? null;

  const serializedChecklist = checklist
    ? {
        ...checklist,
        createdAt: checklist.createdAt.toISOString(),
        updatedAt: checklist.updatedAt.toISOString(),
      }
    : null;

  const serializedEvent = goLiveEvent
    ? {
        ...goLiveEvent,
        celebratedAt: goLiveEvent.celebratedAt.toISOString(),
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
        stage="go_live"
        status={status}
        title="Go-Live"
        description="Manage the go-live checklist, trigger production switch, and celebrate!"
        isAdmin={true}
        projectId={id}
        backHref={`/dashboard/admin/projects/${id}`}
      >
        <div className="space-y-8">
          <AdminGoLiveContent
            projectId={id}
            projectName={project.name}
            checklist={serializedChecklist}
            goLiveEvent={serializedEvent}
            currentUserId={user.id}
            goLiveDate={project.goLiveDate?.toISOString() ?? null}
          />

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
