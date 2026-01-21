import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, messages, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc, sql } from "drizzle-orm";
import Link from "next/link";
import {
  FolderOpen,
  MessageSquare,
  Clock,
  AlertCircle,
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  Plus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

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
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-100 rounded-[32px] p-12 text-center max-w-md shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Pending</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your client profile is being initialized.
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

  return (
    <div className="flex-1 overflow-y-auto bg-white p-8 space-y-8 no-scrollbar relative font-geist">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1.5">Status board for all active implementations and deliveries.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#6366F1] transition-colors" />
            <input
              type="text"
              placeholder="Search projects..."
              className="pl-11 pr-4 py-2.5 w-72 bg-gray-50/50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#6366F1]/10 focus:border-[#6366F1]/20 transition-all"
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl font-semibold text-gray-500">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-enter delay-200">
        {clientProjects.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-gray-50/30 border border-dashed border-gray-200 rounded-[40px] flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center mb-6 border border-gray-100">
              <FolderOpen className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">No active projects found</h3>
            <p className="text-xs text-gray-400 mt-2 font-medium">Try adjusting your search or filters</p>
          </div>
        ) : (
          clientProjects.map((project, idx) => (
            <ProjectCard key={project.id} project={project} index={idx} />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, index }: any) {
  const statusLabels: any = {
    planning: 'Planning',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
    on_hold: 'On Hold'
  };

  const statusColors: any = {
    planning: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    in_progress: 'bg-[#6366F1]/5 text-[#6366F1] border-[#6366F1]/10',
    review: 'bg-amber-50 text-amber-600 border-amber-100',
    completed: 'bg-gray-50 text-gray-500 border-gray-100',
    on_hold: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <Link href={`/dashboard/client/projects/${project.id}`}>
      <div className="group bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 relative overflow-hidden group-hover:border-indigo-100 transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform duration-500">
              {project.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#6366F1] transition-colors leading-tight">{project.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
                  statusColors[project.status] || statusColors.planning
                )}>
                  {statusLabels[project.status]}
                </span>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">•</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
              </div>
            </div>
          </div>
          <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-[#6366F1]/10 transition-colors">
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#6366F1] transition-colors" />
          </div>
        </div>

        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-6">
          {project.description || 'Full deliverable roadmap, execution metrics and pipeline visibility for this implementation.'}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-400">
              <span>Project Velocity</span>
              <span className="text-[#6366F1]">65%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
              <div
                className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] rounded-full transition-all duration-1000 ease-out"
                style={{ width: '65%', animation: 'growBar 1.5s var(--ease-premium) forwards' }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50/50">
            <div className="flex items-center gap-1.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
              <div className="w-6 h-6 rounded-lg bg-gray-100 border-2 border-white shadow-sm overflow-hidden">
                <img src="https://i.pravatar.cc/100?img=1" alt="Team" className="w-full h-full object-cover" />
              </div>
              <div className="w-6 h-6 rounded-lg bg-gray-200 border-2 border-white shadow-sm overflow-hidden -ml-2.5">
                <img src="https://i.pravatar.cc/100?img=2" alt="Team" className="w-full h-full object-cover" />
              </div>
              <span className="text-[9px] font-bold text-gray-400 ml-1.5">Team +2</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>Updated 2h ago</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
