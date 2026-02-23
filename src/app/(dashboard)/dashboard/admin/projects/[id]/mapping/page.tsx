import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { AdminMappingContent } from "@/components/admin-mapping-content";
import { AdminFlagSection } from "@/components/admin-flag-section";
import { deriveStageStatus } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function AdminMappingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("mapping", project.currentStage);

  // Fetch unresolved flags for this project
  const unresolvedFlags = await db
    .select()
    .from(clientFlags)
    .where(
      and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))
    );

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-6 lg:p-10 space-y-6">
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/admin/projects"
      />

      {/* Flags */}
      <AdminFlagSection
        flags={unresolvedFlags.map((f) => ({
          id: f.id,
          message: f.message,
          type: f.type,
          createdAt: f.createdAt.toISOString(),
        }))}
        projectId={id}
      />

      <StageCard
        stage="mapping"
        status={status}
        title="Data Mapping"
        description="Review submitted data mappings, flag issues, and approve for export."
        isAdmin={true}
        projectId={id}
        backHref={`/dashboard/admin/projects/${id}`}
      >
        <AdminMappingContent projectId={id} projectName={project.name} />
      </StageCard>
    </div>
  );
}
