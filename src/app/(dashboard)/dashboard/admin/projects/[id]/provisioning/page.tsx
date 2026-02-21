import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { deriveStageStatus } from "@/lib/lifecycle";
import { AdminProvisioningContent } from "@/components/admin-provisioning-content";

export const dynamic = "force-dynamic";

export default async function AdminProvisioningPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("provisioning", project.currentStage);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-6 lg:p-10 space-y-6">
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/admin/projects"
      />
      <StageCard
        stage="provisioning"
        status={status}
        title="System Provisioning"
        description="Initialize and verify the client's provisioning steps for HiBob, KeyPay, and Workato."
        isAdmin={true}
        projectId={id}
        backHref={`/dashboard/admin/projects/${id}`}
      >
        <AdminProvisioningContent projectId={id} projectName={project.name} />
      </StageCard>
    </div>
  );
}
