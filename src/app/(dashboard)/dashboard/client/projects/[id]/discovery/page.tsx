import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { DdFlagBanner } from "@/components/dd-flag-banner";
import { ClientFlagButton } from "@/components/client-flag-button";
import { deriveStageStatus } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function ClientDiscoveryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("discovery", project.currentStage);

  const flags = await db
    .select()
    .from(clientFlags)
    .where(and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt)));

  return (
    <div className="min-h-full bg-[#F4F5F9] px-7 py-6 space-y-6">
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/client/projects"
      />
      <DdFlagBanner flags={flags.map(f => ({ ...f, createdAt: f.createdAt.toISOString() }))} projectId={id} />
      <StageCard
        stage="discovery"
        status={status}
        title="Discovery"
        description="Complete the discovery questionnaire to help us understand your integration requirements."
        isAdmin={false}
        projectId={id}
        backHref={`/dashboard/client/projects/${id}`}
      >
        <div className="flex items-center justify-between">
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-6 text-center flex-1">
            <p className="text-sm font-semibold text-violet-700">Coming in Sprint 4</p>
            <p className="text-xs text-violet-500 mt-1">Guided questionnaire with section-by-section navigation and save/resume.</p>
          </div>
        </div>
        {status !== "locked" && (
          <div className="flex justify-end pt-2">
            <ClientFlagButton projectId={id} />
          </div>
        )}
      </StageCard>
    </div>
  );
}
