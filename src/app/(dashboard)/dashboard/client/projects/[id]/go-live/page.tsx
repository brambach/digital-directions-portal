import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags, goLiveChecklist, goLiveEvents } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { DdFlagBanner } from "@/components/dd-flag-banner";
import { ClientFlagButton } from "@/components/client-flag-button";
import { ClientGoLiveContent } from "@/components/client-go-live-content";
import { deriveStageStatus } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function ClientGoLivePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("go_live", project.currentStage);

  const [flags, checklistRows, eventRows] = await Promise.all([
    db
      .select()
      .from(clientFlags)
      .where(and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))),
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
    <div className="min-h-full bg-[#F4F5F9] px-7 py-6 space-y-6">
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/client/projects"
      />
      <DdFlagBanner flags={flags.map(f => ({ ...f, createdAt: f.createdAt.toISOString() }))} projectId={id} />
      <StageCard
        stage="go_live"
        status={status}
        title="Go-Live"
        description="Complete the final checklist and prepare to switch your integration to production."
        isAdmin={false}
        projectId={id}
        backHref={`/dashboard/client/projects/${id}`}
      >
        <div className="space-y-8">
          <ClientGoLiveContent
            projectId={id}
            projectName={project.name}
            checklist={serializedChecklist}
            goLiveEvent={serializedEvent}
            currentUserId={user.id}
            goLiveDate={project.goLiveDate?.toISOString() ?? null}
          />
        </div>
        {status !== "locked" && !goLiveEvent && (
          <div className="flex justify-end pt-2">
            <ClientFlagButton projectId={id} />
          </div>
        )}
      </StageCard>
    </div>
  );
}
