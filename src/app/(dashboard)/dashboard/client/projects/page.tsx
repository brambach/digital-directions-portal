import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, files, messages, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { FolderOpen, FileText, MessageSquare, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export const dynamic = "force-dynamic";

// Helper function to get status badge
function getStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", label: "In Progress" };
    case "review":
      return { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", label: "In Review" };
    case "completed":
      return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Completed" };
    case "on_hold":
      return { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", label: "On Hold" };
    case "planning":
      return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", label: "Planning" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", label: status };
  }
}

export default async function ClientProjectsPage() {
  const user = await requireAuth();

  // Get client info
  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, user.clientId!), isNull(clients.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] || null);

  if (!client) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="bg-white border-amber-200 rounded-2xl p-6 text-center border shadow-sm">
          <p className="text-amber-600">No client profile found. Please contact Digital Directions support.</p>
        </div>
      </div>
    );
  }

  // Fetch all projects for this client
  const clientProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, client.id), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));

  // Get file and message counts for each project
  const projectData = await Promise.all(
    clientProjects.map(async (project) => {
      const [fileCount, messageCount, unreadCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(files)
          .where(eq(files.projectId, project.id))
          .then((rows) => rows[0]?.count || 0),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(and(eq(messages.projectId, project.id), isNull(messages.deletedAt)))
          .then((rows) => rows[0]?.count || 0),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.projectId, project.id),
              eq(messages.read, false),
              isNull(messages.deletedAt)
            )
          )
          .then((rows) => rows[0]?.count || 0),
      ]);

      return {
        ...project,
        fileCount,
        messageCount,
        unreadCount,
      };
    })
  );

  const now = new Date();

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-12 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          My Projects
        </h1>

        {projectData.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-lg font-medium text-slate-600 mb-2">No projects yet</p>
            <p className="text-slate-400 text-sm">
              Your Digital Directions consultant will set up projects for you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projectData.map((project, index) => {
              const statusBadge = getStatusBadge(project.status);
              const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

              return (
                <Link
                  key={project.id}
                  href={`/dashboard/client/projects/${project.id}`}
                  className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group relative overflow-hidden animate-on-scroll"
                  style={{ animation: `animationIn 0.5s ease-out ${0.2 + index * 0.05}s both` }}
                >
                  <div className="flex flex-col h-full relative z-10">
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">
                        {project.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} whitespace-nowrap shadow-sm uppercase tracking-wider`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description}</p>
                    )}

                    {/* Due Date */}
                    {project.dueDate && (
                      <div className={`text-xs mb-4 flex items-center gap-1.5 ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
                        {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>
                          {isOverdue ? "Overdue" : "Due"} {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                        </span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-auto pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>{project.fileCount} {project.fileCount === 1 ? "file" : "files"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>{project.messageCount} {project.messageCount === 1 ? "message" : "messages"}</span>
                        {project.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-indigo-600 rounded-full">
                            {project.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
