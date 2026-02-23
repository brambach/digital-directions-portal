import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags, uatResults, uatTemplates, signoffs } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { DdFlagBanner } from "@/components/dd-flag-banner";
import { ClientFlagButton } from "@/components/client-flag-button";
import { ClientUatContent } from "@/components/client-uat-content";
import { deriveStageStatus } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function ClientUatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("uat", project.currentStage);

  const [flags, uatResultRows, uatSignoff] = await Promise.all([
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
  ]);

  const uatResult = uatResultRows[0] ?? null;
  const signoff = uatSignoff[0] ?? null;

  // Fetch template if result exists
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
        stage="uat"
        status={status}
        title="UAT & Sign-Off"
        description="Work through test scenarios and sign off when everything is verified."
        isAdmin={false}
        projectId={id}
        backHref={`/dashboard/client/projects/${id}`}
      >
        <div className="space-y-6">
          <ClientUatContent
            projectId={id}
            uatResult={serializedUatResult}
            template={serializedTemplate}
            signoff={serializedSignoff}
          />

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
