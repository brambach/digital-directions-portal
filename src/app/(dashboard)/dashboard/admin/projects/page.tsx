import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, users } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import type { AdminUser } from "@/components/add-project-dialog";
import Link from "next/link";
import {
  FolderKanban,
  Clock,
  CheckCircle,
  FileSearch,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import dynamicImport from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AddProjectDialog = dynamicImport(
  () => import("@/components/add-project-dialog").then((mod) => ({ default: mod.AddProjectDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ProjectsPage() {
  await requireAdmin();

  // Fetch all clients and admin users for the project form
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

  // Fetch all projects with their client info
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
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

  // Group projects by status
  const groupedProjects = {
    planning: allProjects.filter((p) => p.status === "planning"),
    in_progress: allProjects.filter((p) => p.status === "in_progress"),
    review: allProjects.filter((p) => p.status === "review"),
    completed: allProjects.filter((p) => p.status === "completed"),
    on_hold: allProjects.filter((p) => p.status === "on_hold"),
  };

  const statusColumns = [
    { key: "planning", title: "Planning", icon: Clock, projects: groupedProjects.planning, color: 'text-slate-400' },
    { key: "in_progress", title: "In Progress", icon: FolderKanban, projects: groupedProjects.in_progress, color: 'text-[#7C1CFF]' },
    { key: "review", title: "Review", icon: FileSearch, projects: groupedProjects.review, color: 'text-amber-500' },
    { key: "completed", title: "Completed", icon: CheckCircle, projects: groupedProjects.completed, color: 'text-emerald-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] no-scrollbar">
      {/* Page Header — Pattern A */}
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
        {/* Kanban Grid */}
        <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar">
          {statusColumns.map((column, colIdx) => (
            <div key={column.key} className="flex-shrink-0 w-[320px] animate-enter" style={{ animationDelay: `${colIdx * 0.1}s` }}>
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full",
                    column.key === 'planning' ? 'bg-slate-400' :
                      column.key === 'in_progress' ? 'bg-[#7C1CFF]' :
                        column.key === 'review' ? 'bg-amber-500' : 'bg-emerald-500'
                  )}></div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{column.title}</span>
                  <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-100">{column.projects.length}</span>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors" aria-label="Column options">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Cards List */}
              <div className="space-y-4">
                {column.projects.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400">Empty</p>
                  </div>
                ) : (
                  column.projects.map((project, idx) => (
                    <ProjectCard key={project.id} project={project} index={idx} />
                  ))
                )}
              </div>
            </div>
          ))}
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
    status: string;
    dueDate: Date | null;
    clientName: string | null;
  };
  index: number;
}

function ProjectCard({ project, index }: ProjectCardProps) {
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'completed';

  return (
    <Link href={`/dashboard/admin/projects/${project.id}`} className="block group">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-violet-200 hover:-translate-y-1 relative overflow-hidden transition-all duration-200">
        {/* Status Label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#7C1CFF] group-hover:bg-[#7C1CFF] group-hover:text-white transition-all duration-300 shadow-sm shadow-violet-100">
              {project.clientName?.charAt(0) || "P"}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-900 group-hover:text-[#7C1CFF] transition-colors uppercase tracking-tight">{project.clientName}</span>
              <span className="text-[10px] text-slate-500 font-medium">{formatStatus(project.status)}</span>
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
