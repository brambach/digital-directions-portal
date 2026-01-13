import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { FolderKanban, Clock, CheckCircle, AlertCircle, Pause, FileSearch, ExternalLink, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

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
    .orderBy(projects.createdAt);

  // Group projects by status
  const groupedProjects = {
    planning: allProjects.filter((p) => p.status === "planning"),
    in_progress: allProjects.filter((p) => p.status === "in_progress"),
    review: allProjects.filter((p) => p.status === "review"),
    completed: allProjects.filter((p) => p.status === "completed"),
    on_hold: allProjects.filter((p) => p.status === "on_hold"),
  };

  const now = new Date();

  // Status column configs
  const statusColumns = [
    {
      key: "planning",
      title: "Planning",
      icon: Clock,
      color: "slate",
      projects: groupedProjects.planning,
    },
    {
      key: "in_progress",
      title: "In Progress",
      icon: FolderKanban,
      color: "indigo",
      projects: groupedProjects.in_progress,
    },
    {
      key: "review",
      title: "In Review",
      icon: FileSearch,
      color: "purple",
      projects: groupedProjects.review,
    },
    {
      key: "completed",
      title: "Completed",
      icon: CheckCircle,
      color: "emerald",
      projects: groupedProjects.completed,
    },
    {
      key: "on_hold",
      title: "On Hold",
      icon: Pause,
      color: "orange",
      projects: groupedProjects.on_hold,
    },
  ];

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <FolderKanban className="w-7 h-7 text-indigo-600" />
              Projects
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              Track all client projects organized by status and timeline.
            </p>
          </div>
          <AddProjectDialog clients={allClients} />
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pb-12">
          {statusColumns.map((column, colIndex) => {
            const Icon = column.icon;
            return (
              <div
                key={column.key}
                className="animate-on-scroll"
                style={{ animation: `animationIn 0.5s ease-out ${0.2 + colIndex * 0.1}s both` }}
              >
                {/* Column Header */}
                <div className={`bg-${column.color}-50 border border-${column.color}-200 rounded-xl p-4 mb-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${column.color}-600`} />
                      <h2 className={`text-sm font-bold text-${column.color}-700 uppercase tracking-wider`}>
                        {column.title}
                      </h2>
                    </div>
                    <span className={`text-xs font-semibold text-${column.color}-600 bg-white px-2 py-0.5 rounded-full`}>
                      {column.projects.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="space-y-3">
                  {column.projects.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                      <Icon className="w-8 h-8 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                      <p className="text-xs text-slate-400">No projects</p>
                    </div>
                  ) : (
                    column.projects.map((project) => {
                      const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

                      return (
                        <Link
                          key={project.id}
                          href={`/dashboard/admin/projects/${project.id}`}
                          className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
                              {project.name}
                            </h3>
                            <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>

                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                            {project.description || "No description"}
                          </p>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <div className={`w-6 h-6 rounded-md bg-${column.color}-50 border border-${column.color}-200 flex items-center justify-center text-${column.color}-600 font-semibold text-[10px]`}>
                                {project.clientName?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??"}
                              </div>
                              <span className="truncate">{project.clientName}</span>
                            </div>

                            {project.dueDate && (
                              <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  {isOverdue ? "Overdue " : "Due "}
                                  {formatDistanceToNow(new Date(project.dueDate), { addSuffix: !isOverdue })}
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
