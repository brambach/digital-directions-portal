import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import Link from "next/link";
import {
  FolderKanban,
  Clock,
  CheckCircle,
  Pause,
  FileSearch,
  ArrowUpRight,
  Calendar,
  Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import dynamicImport from "next/dynamic";

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

  // Status column configs with proper styling
  const statusColumns = [
    {
      key: "planning",
      title: "Planning",
      icon: Clock,
      headerBg: "bg-slate-50",
      headerBorder: "border-slate-200",
      headerText: "text-slate-700",
      iconColor: "text-slate-500",
      countBg: "bg-slate-200",
      countText: "text-slate-700",
      cardHover: "hover:border-slate-300",
      projects: groupedProjects.planning,
    },
    {
      key: "in_progress",
      title: "In Progress",
      icon: FolderKanban,
      headerBg: "bg-violet-50",
      headerBorder: "border-violet-200",
      headerText: "text-violet-700",
      iconColor: "text-violet-500",
      countBg: "bg-violet-200",
      countText: "text-violet-700",
      cardHover: "hover:border-violet-300",
      projects: groupedProjects.in_progress,
    },
    {
      key: "review",
      title: "In Review",
      icon: FileSearch,
      headerBg: "bg-blue-50",
      headerBorder: "border-blue-200",
      headerText: "text-blue-700",
      iconColor: "text-blue-500",
      countBg: "bg-blue-200",
      countText: "text-blue-700",
      cardHover: "hover:border-blue-300",
      projects: groupedProjects.review,
    },
    {
      key: "completed",
      title: "Completed",
      icon: CheckCircle,
      headerBg: "bg-emerald-50",
      headerBorder: "border-emerald-200",
      headerText: "text-emerald-700",
      iconColor: "text-emerald-500",
      countBg: "bg-emerald-200",
      countText: "text-emerald-700",
      cardHover: "hover:border-emerald-300",
      projects: groupedProjects.completed,
    },
    {
      key: "on_hold",
      title: "On Hold",
      icon: Pause,
      headerBg: "bg-amber-50",
      headerBorder: "border-amber-200",
      headerText: "text-amber-700",
      iconColor: "text-amber-500",
      countBg: "bg-amber-200",
      countText: "text-amber-700",
      cardHover: "hover:border-amber-300",
      projects: groupedProjects.on_hold,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-violet-500" />
              <span className="text-label text-violet-600">Board View</span>
            </div>
            <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
              Projects
            </h1>
            <p className="text-slate-500 max-w-lg">
              Track all client projects organized by status. Drag-and-drop
              coming soon.
            </p>
          </div>
          <AddProjectDialog clients={allClients} />
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-3 mb-8 animate-fade-in-up opacity-0 stagger-2">
          {statusColumns.map((column) => {
            const Icon = column.icon;
            return (
              <div
                key={column.key}
                className={`${column.headerBg} rounded-xl p-4 border ${column.headerBorder}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${column.iconColor}`} />
                    <span
                      className={`text-xs font-semibold ${column.headerText} uppercase tracking-wider`}
                    >
                      {column.title}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold ${column.headerText} ${column.countBg} px-2 py-0.5 rounded-full min-w-[24px] text-center`}
                  >
                    {column.projects.length}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pb-12">
          {statusColumns.map((column, colIndex) => {
            const Icon = column.icon;
            return (
              <div
                key={column.key}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.15 + colIndex * 0.05}s` }}
              >
                {/* Column Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {column.projects.length === 0 ? (
                    <div className="card-elevated p-6 text-center border-dashed">
                      <Icon
                        className="w-8 h-8 text-slate-300 mx-auto mb-2"
                        strokeWidth={1.5}
                      />
                      <p className="text-xs text-slate-400">No projects</p>
                    </div>
                  ) : (
                    column.projects.map((project, index) => {
                      const isOverdue =
                        project.dueDate &&
                        new Date(project.dueDate) < now &&
                        project.status !== "completed";

                      return (
                        <Link
                          key={project.id}
                          href={`/dashboard/admin/projects/${project.id}`}
                          className={`card-elevated p-4 block group transition-all duration-200 ${column.cardHover} hover:shadow-md animate-fade-in-up opacity-0`}
                          style={{
                            animationDelay: `${0.2 + colIndex * 0.05 + index * 0.03}s`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-violet-700 transition-colors leading-snug">
                              {project.name}
                            </h3>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>

                          {project.description && (
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          )}

                          <div className="flex flex-col gap-2">
                            {/* Client badge */}
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                                {project.clientName
                                  ?.split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2) || "??"}
                              </div>
                              <span className="text-xs text-slate-600 truncate">
                                {project.clientName}
                              </span>
                            </div>

                            {/* Due date */}
                            {project.dueDate && (
                              <div
                                className={`flex items-center gap-1.5 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-slate-400"}`}
                              >
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  {isOverdue ? "Overdue" : "Due"}{" "}
                                  {formatDistanceToNow(
                                    new Date(project.dueDate),
                                    { addSuffix: true }
                                  )}
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
    </div>
  );
}
