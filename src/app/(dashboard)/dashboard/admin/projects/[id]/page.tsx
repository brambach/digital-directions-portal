import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, integrationMonitors, clientFlags, users } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Link as LinkIcon, User, UserCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import dynamicImport from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IntegrationManagementSection } from "@/components/integration-management-section";
import { LifecycleStepper } from "@/components/lifecycle-stepper";
import { AdminFlagSection } from "@/components/admin-flag-section";
import { StageAdvanceButton } from "@/components/stage-advance-button";
import { stageSlug } from "@/lib/lifecycle";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger-container";

const EditProjectDialog = dynamicImport(
  () => import("@/components/edit-project-dialog").then((mod) => ({ default: mod.EditProjectDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [project, adminDbUsers] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        currentStage: projects.currentStage,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        createdAt: projects.createdAt,
        clientId: projects.clientId,
        clientName: clients.companyName,
        clientContact: clients.contactName,
        clientEmail: clients.contactEmail,
        assignedSpecialists: projects.assignedSpecialists,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt))),
  ]);

  if (!project) {
    notFound();
  }

  const clerk = await clerkClient();
  const adminUsers = await Promise.all(
    adminDbUsers.map(async (u) => {
      try {
        const cu = await clerk.users.getUser(u.clerkId);
        return {
          id: u.id,
          name: `${cu.firstName || ""} ${cu.lastName || ""}`.trim() || cu.emailAddresses[0]?.emailAddress || "Admin",
          email: cu.emailAddresses[0]?.emailAddress || "",
          imageUrl: cu.imageUrl || null,
        };
      } catch {
        return { id: u.id, name: "Admin", email: "", imageUrl: null };
      }
    })
  );

  const specialistIds: string[] = project.assignedSpecialists
    ? JSON.parse(project.assignedSpecialists)
    : [];
  const assignedSpecialists = adminUsers
    .filter((u) => specialistIds.includes(u.id))
    .map((u) => ({ name: u.name, imageUrl: u.imageUrl }));

  const integrations = await db
    .select()
    .from(integrationMonitors)
    .where(and(eq(integrationMonitors.projectId, id), isNull(integrationMonitors.deletedAt)))
    .orderBy(desc(integrationMonitors.createdAt));

  const unresolvedFlags = await db
    .select()
    .from(clientFlags)
    .where(
      and(eq(clientFlags.projectId, id), isNull(clientFlags.resolvedAt))
    );

  const now = new Date();
  const daysLeft = project.dueDate ? differenceInDays(new Date(project.dueDate), now) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] no-scrollbar">
      {/* Page Header — Pattern A with back nav */}
      <div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
        <Link
          href="/dashboard/admin/projects"
          className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
            </div>
            <p className="text-sm text-slate-500">
              {project.clientName} &middot; {project.description || "HiBob integration project"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {stageSlug(project.currentStage) === null && (
              <StageAdvanceButton projectId={project.id} currentStage={project.currentStage} />
            )}
            <EditProjectDialog
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                startDate: project.startDate,
                dueDate: project.dueDate,
                assignedSpecialists: specialistIds,
              }}
              adminUsers={adminUsers}
            />
          </div>
        </div>
      </div>

      <StaggerContainer className="p-6 lg:p-10 space-y-6">

      {/* Lifecycle Stepper */}
      <StaggerItem>
      <LifecycleStepper
        currentStage={project.currentStage}
        projectId={id}
        basePath="/dashboard/admin/projects"
      />

      </StaggerItem>

      {/* Flags */}
      <StaggerItem>
      <AdminFlagSection
        flags={unresolvedFlags.map((f) => ({
          id: f.id,
          message: f.message,
          type: f.type,
          createdAt: f.createdAt.toISOString(),
        }))}
        projectId={id}
      />

      </StaggerItem>

      {/* Stats Row */}
      <StaggerItem>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery</p>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "TBD"}
          </p>
          {daysLeft !== null && (
            <p className={cn("text-xs font-semibold mt-1", daysLeft < 0 ? "text-red-500" : "text-emerald-500")}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <LinkIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Systems</p>
          </div>
          <p className="text-lg font-bold text-slate-900">{integrations.length}</p>
          <p className="text-xs text-slate-400 mt-1">Active integrations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <User className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
          </div>
          <p className="text-sm font-bold text-slate-900">{project.clientContact}</p>
          <p className="text-xs text-slate-400 mt-1 truncate">{project.clientEmail}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Specialist</p>
          {assignedSpecialists.length > 0 ? (
            <div className="space-y-2.5">
              {assignedSpecialists.map(({ name, imageUrl }) => {
                const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={name} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-violet-100 shadow-sm">
                      {imageUrl ? (
                        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-500 to-[#7C1CFF] flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">{initials}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 mt-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <UserCircle2 className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400 italic">Unassigned</p>
            </div>
          )}
        </div>
      </div>

      </StaggerItem>

      {/* Connected Systems */}
      <StaggerItem>
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Connected Systems</h3>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <IntegrationManagementSection
            projectId={id}
            clientId={project.clientId}
            integrations={integrations}
          />
        </div>
      </div>
      </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
