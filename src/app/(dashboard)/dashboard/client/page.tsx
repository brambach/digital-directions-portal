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
  CheckCircle,
  ArrowRight,
  Layers,
  Activity,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SupportHoursCard } from "@/components/support-hours-card";
import { IntegrationHealthGrid } from "@/components/integration-health-grid";

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

export default async function ClientDashboard() {
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

  // Calculate stats
  const totalProjects = projectData.length;
  const activeProjects = projectData.filter(
    (p) =>
      p.status === "in_progress" ||
      p.status === "planning" ||
      p.status === "review"
  ).length;
  const completedProjects = projectData.filter(
    (p) => p.status === "completed"
  ).length;
  const totalFiles = projectData.reduce((sum, p) => sum + p.fileCount, 0);

  const now = new Date();

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        {/* Welcome Header */}
        <header className="mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-label text-violet-600">Your Dashboard</span>
          </div>
          <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
            Welcome back
          </h1>
          <p className="text-slate-500">
            Here&apos;s an overview of your projects and integrations.
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="stat-card animate-fade-in-up opacity-0 stagger-2">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div className="stat-value">{totalProjects}</div>
            <div className="stat-label">Total Projects</div>
          </div>

          <div className="stat-card animate-fade-in-up opacity-0 stagger-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <div className="stat-value text-violet-700">{activeProjects}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>

          <div className="stat-card animate-fade-in-up opacity-0 stagger-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="stat-value text-emerald-700">
                {completedProjects}
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card animate-fade-in-up opacity-0 stagger-3">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div className="stat-value">{totalFiles}</div>
            <div className="stat-label">Files</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {/* Support Hours - Takes 1 column */}
          <div className="animate-fade-in-up opacity-0 stagger-4">
            <div className="section-divider mb-4">
              <Clock className="w-4 h-4 text-violet-500" />
              <span>Support Hours</span>
            </div>
            <SupportHoursCard clientId={client.id} isAdmin={false} />
          </div>

          {/* Integration Health - Takes 2 columns */}
          <div className="lg:col-span-2 animate-fade-in-up opacity-0 stagger-4">
            <div className="section-divider mb-4">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Integration Health</span>
            </div>
            <IntegrationHealthGrid clientId={client.id} />
          </div>
        </div>

        {/* Projects Section */}
        <section className="animate-fade-in-up opacity-0 stagger-5">
          <div className="flex items-center justify-between mb-6">
            <div className="section-divider flex-1">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Your Projects</span>
            </div>
            <Link
              href="/dashboard/client/projects"
              className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {projectData.length === 0 ? (
            <div className="card-elevated">
              <div className="empty-state">
                <FolderOpen className="empty-state-icon" />
                <h3 className="empty-state-title">No projects yet</h3>
                <p className="empty-state-description">
                  Your Digital Directions consultant will set up projects for
                  you. Check back soon!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projectData.slice(0, 4).map((project, index) => {
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
                    className="card-interactive p-5 group animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-heading text-base text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-1">
                        {project.name}
                      </h3>
                      <span className={config.className}>{config.label}</span>
                    </div>

                    {project.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}

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

          {projectData.length > 4 && (
            <div className="mt-6 text-center">
              <Link
                href="/dashboard/client/projects"
                className="btn-secondary"
              >
                View All {projectData.length} Projects
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
