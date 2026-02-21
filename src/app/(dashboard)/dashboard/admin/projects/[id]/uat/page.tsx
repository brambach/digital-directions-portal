import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { deriveStageStatus } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function AdminUatPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("uat", project.currentStage);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-6 lg:p-10 space-y-6">
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/admin/projects"
      />
      <StageCard
        stage="uat"
        status={status}
        title="UAT & Sign-Off"
        description="Review UAT results and counter-sign the client's test sign-off."
        isAdmin={true}
        projectId={id}
        backHref={`/dashboard/admin/projects/${id}`}
      >
        <div className="rounded-xl bg-violet-50 border border-violet-100 p-6 text-center">
          <p className="text-sm font-semibold text-violet-700">Coming in Sprint 8</p>
          <p className="text-xs text-violet-500 mt-1">UAT checklist, scenario testing, and dual sign-off workflow.</p>
        </div>
      </StageCard>
    </div>
  );
}
