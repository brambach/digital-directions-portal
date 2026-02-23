import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags, uatResults, uatTemplates, signoffs } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { AdminFlagSection } from "@/components/admin-flag-section";
import { AdminUatContent } from "@/components/admin-uat-content";
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

  const [unresolvedFlags, uatResultRows, uatSignoff, availableTemplates] = await Promise.all([
    db
      .select()
      .from(clientFlags)
      .where(and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))),
    db
      .select()
      .from(uatResults)
      .where(eq(uatResults.projectId, id))
      .limit(1),
    db
      .select()
      .from(signoffs)
      .where(and(eq(signoffs.projectId, id), eq(signoffs.type, "uat")))
      .limit(1),
    db
      .select()
      .from(uatTemplates)
      .where(and(eq(uatTemplates.isActive, true), isNull(uatTemplates.deletedAt))),
  ]);

  const uatResult = uatResultRows[0] ?? null;
  const signoff = uatSignoff[0] ?? null;

  // If UAT result exists, fetch the template to get scenario data
  let template = null;
  if (uatResult) {
    const [t] = await db
      .select()
      .from(uatTemplates)
      .where(eq(uatTemplates.id, uatResult.templateId))
      .limit(1);
    template = t ?? null;
  }

  const serializedUatResult = uatResult
    ? {
        ...uatResult,
        submittedAt: uatResult.submittedAt?.toISOString() ?? null,
        reviewedAt: uatResult.reviewedAt?.toISOString() ?? null,
        createdAt: uatResult.createdAt.toISOString(),
        updatedAt: uatResult.updatedAt.toISOString(),
      }
    : null;

  const serializedTemplate = template
    ? {
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        deletedAt: template.deletedAt?.toISOString() ?? null,
      }
    : null;

  const serializedSignoff = signoff
    ? {
        ...signoff,
        signedAt: signoff.signedAt?.toISOString() ?? null,
        ddCounterSignedAt: signoff.ddCounterSignedAt?.toISOString() ?? null,
        createdAt: signoff.createdAt.toISOString(),
      }
    : null;

  const serializedAvailableTemplates = availableTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    payrollSystem: t.payrollSystem,
    scenarios: t.scenarios,
  }));

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
        description="Publish UAT scenarios, review client test results, and manage the UAT sign-off."
        isAdmin={true}
        projectId={id}
        backHref={`/dashboard/admin/projects/${id}`}
      >
        <div className="space-y-8">
          <AdminUatContent
            projectId={id}
            uatResult={serializedUatResult}
            template={serializedTemplate}
            signoff={serializedSignoff}
            availableTemplates={serializedAvailableTemplates}
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
