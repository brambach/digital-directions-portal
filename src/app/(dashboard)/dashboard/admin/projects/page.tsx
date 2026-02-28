import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, users } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import type { AdminUser } from "@/components/add-project-dialog";
import Link from "next/link";
import {
  FolderKanban,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import dynamicImport from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";

const AddProjectDialog = dynamicImport(
  () => import("@/components/add-project-dialog").then((mod) => ({ default: mod.AddProjectDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  discovery:    "Discovery",
  provisioning: "Provisioning",
  bob_config:   "Bob Config",
  mapping:      "Mapping",
  build:        "Build",
  uat:          "UAT",
  go_live:      "Go-Live",
  support:      "Support",
};

const STAGE_COLORS: Record<string, { dot: string; text: string }> = {
  discovery:    { dot: "bg-sky-500",     text: "text-sky-700"     },
  provisioning: { dot: "bg-indigo-500",  text: "text-indigo-700"  },
  bob_config:   { dot: "bg-violet-500",  text: "text-violet-700"  },
  mapping:      { dot: "bg-purple-500",  text: "text-purple-700"  },
  build:        { dot: "bg-fuchsia-500", text: "text-fuchsia-700" },
  uat:          { dot: "bg-amber-500",   text: "text-amber-700"   },
  go_live:      { dot: "bg-emerald-500", text: "text-emerald-700" },
  support:      { dot: "bg-teal-500",    text: "text-teal-700"    },
};

// Kanban columns — skip pre_sales (projects enter portal at discovery)
const STAGE_COLUMNS = [
  "discovery",
  "provisioning",
  "bob_config",
  "mapping",
  "build",
  "uat",
  "go_live",
  "support",
];

export default async function ProjectsPage() {
  await requireAdmin();

  const [allClients, adminDbUsers] = await Promise.all([
    db
      .select({ id: clients.id, companyName: clients.companyName })
      .from(clients)
      .where(isNull(clients.deletedAt))
      .orderBy(clients.companyName),
    db
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt))),
  ]);

  const clerk = await clerkClient();
  const adminUsers: AdminUser[] = await Promise.all(
    adminDbUsers.map(async (u) => {
      try {
        const cu = await clerk.users.getUser(u.clerkId);
        return {
          id: u.id,
          name: `${cu.firstName || ""} ${cu.lastName || ""}`.trim() || cu.emailAddresses[0]?.emailAddress || "Admin",
          email: cu.emailAddresses[0]?.emailAddress || "",
        };
      } catch {
        return { id: u.id, name: "Admin", email: "" };
      }
    })
  );

  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      currentStage: projects.currentStage,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
      clientName: clients.companyName,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(isNull(projects.deletedAt))
    .orderBy(desc(projects.createdAt));

  // Group projects by lifecycle stage
  const groupedByStage: Record<string, typeof allProjects> = {};
  for (const stage of STAGE_COLUMNS) {
    groupedByStage[stage] = allProjects.filter((p) => p.currentStage === stage);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] no-scrollbar">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">General</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          </div>
          <AddProjectDialog clients={allClients} admins={adminUsers} />
        </div>
      </div>

      <div className="p-8">
        {/* Kanban Grid — fluid columns, empty stages collapse */}
        <div className="flex gap-3 overflow-x-auto pb-10 no-scrollbar">
          {STAGE_COLUMNS.map((stage, colIdx) => {
            const stageProjects = groupedByStage[stage] ?? [];
            const colors = STAGE_COLORS[stage];
            const isEmpty = stageProjects.length === 0;

            return (
              <FadeIn
                key={stage}
                delay={colIdx * 0.07}
                className={cn(
                  isEmpty
                    ? "w-10 flex-shrink-0"
                    : "flex-1 min-w-[220px]"
                )}
              >
                {isEmpty ? (
                  /* Collapsed empty column — thin strip with vertical label */
                  <div className="flex flex-col items-center gap-2 pt-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", colors?.dot ?? "bg-slate-400")} />
                    <span className="text-[10px] font-medium text-slate-300 [writing-mode:vertical-lr] uppercase tracking-widest">
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", colors?.dot ?? "bg-slate-400")} />
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-100">
                          {stageProjects.length}
                        </span>
                      </div>
                      <button className="text-slate-300 hover:text-slate-600 transition-colors" aria-label="Column options">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cards */}
                    <div className="space-y-4">
                      {stageProjects.map((project, idx) => (
                        <ProjectCard key={project.id} project={project} stage={stage} index={idx} />
                      ))}
                    </div>
                  </>
                )}
              </FadeIn>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    currentStage: string;
    dueDate: Date | null;
    clientName: string | null;
  };
  stage: string;
  index: number;
}

function ProjectCard({ project, stage }: ProjectCardProps) {
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();
  const colors = STAGE_COLORS[stage];

  return (
    <Link href={`/dashboard/admin/projects/${project.id}`} className="block group">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-violet-200 hover:-translate-y-1 relative overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#7C1CFF] group-hover:bg-[#7C1CFF] group-hover:text-white transition-all duration-300 shadow-sm shadow-violet-100">
              {project.clientName?.charAt(0) || "P"}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-900 group-hover:text-[#7C1CFF] transition-colors uppercase tracking-tight">{project.clientName}</span>
              <span className={cn("text-[10px] font-medium", colors?.text ?? "text-slate-500")}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
          </div>
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
            isOverdue
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          )}>
            {isOverdue ? "Overdue" : "On Track"}
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 mb-2 leading-tight group-hover:text-[#7C1CFF] transition-colors line-clamp-2">{project.name}</h3>

        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <Calendar className={cn("w-3 h-3", isOverdue ? "text-red-400" : "text-slate-400")} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-tight",
              isOverdue ? "text-red-500" : "text-slate-400"
            )}>
              {project.dueDate ? formatDistanceToNow(new Date(project.dueDate), { addSuffix: true }) : "No Date"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
