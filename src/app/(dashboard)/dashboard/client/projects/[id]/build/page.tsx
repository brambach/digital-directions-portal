import { DigiMascot } from "@/components/digi-mascot";
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

export default async function ClientBuildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("build", project.currentStage);

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
        stage="build"
        status={status}
        title="Integration Build"
        description="Track the progress of your integration build and view release notes."
        isAdmin={false}
        projectId={id}
        backHref={`/dashboard/client/projects/${id}`}
      >
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <DigiMascot variant="construction" className="w-48 md:w-64 mb-6" />
          <h3 className="text-base font-bold text-slate-800 mb-2">
            We&apos;re building your integration
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Our team is hard at work. You&apos;ll receive updates here as each milestone is completed.
          </p>
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
