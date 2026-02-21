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
import { ClientProvisioningContent } from "@/components/client-provisioning-content";

export const dynamic = "force-dynamic";

export default async function ClientProvisioningPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("provisioning", project.currentStage);

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
        stage="provisioning"
        status={status}
        title="System Provisioning"
        description="Follow the step-by-step guide to grant your DD Integration Specialist access to each system."
        isAdmin={false}
        projectId={id}
        backHref={`/dashboard/client/projects/${id}`}
      >
        <ClientProvisioningContent projectId={id} />
        {status !== "locked" && (
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
            <ClientFlagButton projectId={id} />
          </div>
        )}
      </StageCard>
    </div>
  );
}
