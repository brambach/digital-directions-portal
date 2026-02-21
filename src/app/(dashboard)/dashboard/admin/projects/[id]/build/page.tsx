import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clientFlags } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { StageCard } from "@/components/stage-card";
import { deriveStageStatus } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function AdminBuildPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) notFound();

  const status = deriveStageStatus("build", project.currentStage);

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
      <StageCard
        stage="build"
        status={status}
        title="Integration Build"
        description="Manage the integration build, publish release notes, and handle client flags."
        isAdmin={true}
        projectId={id}
        backHref={`/dashboard/admin/projects/${id}`}
      >
        {/* Show unresolved flags */}
        {unresolvedFlags.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">
              {unresolvedFlags.length} unresolved flag{unresolvedFlags.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {unresolvedFlags.map((flag) => (
                <div key={flag.id} className="text-sm text-amber-700 bg-amber-100/50 rounded-lg px-3 py-2">
                  <span className="font-medium">
                    {flag.type === "client_blocker" ? "Blocker" : "Input needed"}:
                  </span>{" "}
                  {flag.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-violet-50 border border-violet-100 p-6 text-center">
          <p className="text-sm font-semibold text-violet-700">Coming in Sprint 7</p>
          <p className="text-xs text-violet-500 mt-1">Release notes, milestone tracking, and build spec sign-off.</p>
        </div>
      </StageCard>
    </div>
  );
}
