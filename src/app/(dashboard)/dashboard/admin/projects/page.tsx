import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
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

export default async function ProjectsPage() {
  await requireAdmin();

  // Fetch all clients for the project form
  const allClients = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
    })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(clients.companyName);

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
    { key: "planning", title: "Planning", icon: Clock, projects: groupedProjects.planning, color: 'text-gray-400' },
    { key: "in_progress", title: "In Progress", icon: FolderKanban, projects: groupedProjects.in_progress, color: 'text-purple-700' },
    { key: "review", title: "Review", icon: FileSearch, projects: groupedProjects.review, color: 'text-amber-500' },
    { key: "completed", title: "Completed", icon: CheckCircle, projects: groupedProjects.completed, color: 'text-emerald-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-8 space-y-8 no-scrollbar relative font-geist">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Status board for all client delivery across segments.</p>
        </div>
        <div className="flex items-center gap-3">
          <AddProjectDialog clients={allClients} />
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar">
        {statusColumns.map((column, colIdx) => (
          <div key={column.key} className="flex-shrink-0 w-[320px] animate-enter" style={{ animationDelay: `${colIdx * 0.1}s` }}>
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full",
                  column.key === 'planning' ? 'bg-gray-400' :
                    column.key === 'in_progress' ? 'bg-purple-700' :
                      column.key === 'review' ? 'bg-amber-500' : 'bg-emerald-500'
                )}></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">{column.title}</span>
                <span className="bg-gray-50 text-gray-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gray-100">{column.projects.length}</span>
              </div>
              <button className="text-gray-300 hover:text-gray-600 transition-colors" aria-label="Column options">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Cards List */}
            <div className="space-y-4">
              {column.projects.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Empty</p>
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
      <div className="bg-white border border-gray-100 rounded-[20px] p-5 shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 relative overflow-hidden group-hover:border-purple-100 transition-all duration-300">
        {/* Status Label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition-all duration-300 shadow-sm shadow-purple-100">
              {project.clientName?.charAt(0) || "P"}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-900 group-hover:text-purple-700 transition-colors uppercase tracking-tight">{project.clientName}</span>
              <span className="text-[10px] text-gray-500 font-medium">Active Project</span>
            </div>
          </div>
          <div className={cn(
            "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
            isOverdue
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          )}>
            {isOverdue ? "Overdue" : "On Track"}
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-900 mb-2 leading-tight group-hover:text-purple-700 transition-colors line-clamp-2">{project.name}</h3>

        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <Calendar className={cn("w-3 h-3", isOverdue ? "text-red-400" : "text-gray-400")} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-tight",
              isOverdue ? "text-red-500" : "text-gray-400"
            )}>
              {project.dueDate ? formatDistanceToNow(new Date(project.dueDate), { addSuffix: true }) : "No Date"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
