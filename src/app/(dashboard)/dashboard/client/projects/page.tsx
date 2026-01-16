import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, files, messages, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc, sql } from "drizzle-orm";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  MessageSquare,
  Clock,
  AlertCircle,
  Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

// Status badge configurations
const statusConfig = {
  in_progress: {
    label: "In Progress",
    className: "badge-primary",
  },
  review: {
    label: "In Review",
    className: "badge-info",
  },
  completed: {
    label: "Completed",
    className: "badge-success",
  },
  on_hold: {
    label: "On Hold",
    className: "badge-warning",
  },
  planning: {
    label: "Planning",
    className: "badge-neutral",
  },
} as const;

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
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
        <div className="card-elevated p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-heading text-lg text-slate-900 mb-2">
            No Client Profile Found
          </h2>
          <p className="text-slate-500">
            Please contact Digital Directions support for assistance.
          </p>
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
          .where(
            and(eq(messages.projectId, project.id), isNull(messages.deletedAt))
          )
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
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-violet-500" />
            <span className="text-label text-violet-600">Projects</span>
          </div>
          <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
            My Projects
          </h1>
          <p className="text-slate-500">
            Track your HiBob implementations and integration projects.
          </p>
        </header>

        {/* Projects Grid */}
        {projectData.length === 0 ? (
          <div className="card-elevated animate-fade-in-up opacity-0 stagger-2">
            <div className="empty-state">
              <FolderOpen className="empty-state-icon" />
              <h3 className="empty-state-title">No projects yet</h3>
              <p className="empty-state-description">
                Your Digital Directions consultant will set up projects for you.
                Check back soon!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {projectData.map((project, index) => {
              const config =
                statusConfig[project.status as keyof typeof statusConfig] ||
                statusConfig.planning;
              const isOverdue =
                project.dueDate &&
                new Date(project.dueDate) < now &&
                project.status !== "completed";

              return (
                <Link
                  key={project.id}
                  href={`/dashboard/client/projects/${project.id}`}
                  className="card-interactive p-6 group animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-heading text-lg text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <span className={config.className}>{config.label}</span>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}

                  {/* Due Date */}
                  {project.dueDate && (
                    <div
                      className={`text-xs flex items-center gap-1.5 mb-4 ${
                        isOverdue
                          ? "text-red-600 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {isOverdue ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isOverdue ? "Overdue" : "Due"}{" "}
                        {formatDistanceToNow(new Date(project.dueDate), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Stats Footer */}
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {project.fileCount}{" "}
                        {project.fileCount === 1 ? "file" : "files"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>
                        {project.messageCount}{" "}
                        {project.messageCount === 1 ? "message" : "messages"}
                      </span>
                      {project.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-violet-600 rounded-full">
                          {project.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
