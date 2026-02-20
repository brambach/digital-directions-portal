import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import Link from "next/link";
import { DijiMascot } from "@/components/diji-mascot";
import {
  FolderOpen,
  Clock,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage() {
  const user = await requireAuth();

  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, user.clientId!), isNull(clients.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] || null);

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center max-w-md shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Profile Pending</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your client profile is being initialized.
          </p>
        </div>
      </div>
    );
  }

  const clientProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, client.id), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          </div>
          <p className="text-[13px] text-slate-500">
            {clientProjects.length} {clientProjects.length === 1 ? "project" : "projects"} total
          </p>
        </div>
      </div>

      <div className="px-7 py-6">
        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clientProjects.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center">
              <DijiMascot variant="neutral" size="sm" className="mb-4" />
              <h3 className="text-[13px] font-semibold text-slate-700">No active projects found</h3>
              <p className="text-[12px] text-slate-400 mt-1">Your projects will appear here once started</p>
            </div>
          ) : (
            clientProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: any) {
  const statusLabels: Record<string, string> = {
    planning: "Planning",
    in_progress: "In Progress",
    review: "In Review",
    completed: "Completed",
    on_hold: "On Hold",
  };

  const statusColors: Record<string, string> = {
    planning: "bg-violet-50 text-violet-700",
    in_progress: "bg-violet-50 text-violet-700",
    review: "bg-amber-50 text-amber-700",
    completed: "bg-emerald-50 text-emerald-700",
    on_hold: "bg-slate-100 text-slate-600",
  };

  return (
    <Link href={`/dashboard/client/projects/${project.id}`}>
      <div className="group bg-white border border-slate-100 rounded-2xl p-5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-violet-200 group-hover:scale-105 transition-transform">
              {project.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 group-hover:text-violet-700 transition-colors leading-tight">{project.name}</h3>
              <span className={cn(
                "inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
                statusColors[project.status] || statusColors.planning
              )}>
                {statusLabels[project.status]}
              </span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed mb-5">
          {project.description || "Full deliverable roadmap, execution metrics and pipeline visibility for this implementation."}
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-4 border-t border-slate-50">
          <Clock className="w-3 h-3" />
          <span>Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>
    </Link>
  );
}
