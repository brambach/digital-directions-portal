import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import dynamicImport from "next/dynamic";
import { MessageSquare, ShieldAlert, CheckCircle, Zap, Clock, HelpCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { DijiMascot } from "@/components/diji-mascot";

const CreateTicketDialog = dynamicImport(
  () => import("@/components/create-ticket-dialog").then((mod) => ({ default: mod.CreateTicketDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

function getPriorityConfig(priority: string) {
  switch (priority) {
    case "urgent": return { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", label: "Urgent" };
    case "high": return { dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700", label: "High" };
    case "medium": return { dot: "bg-sky-500", bg: "bg-sky-50", text: "text-sky-700", label: "Medium" };
    case "low": return { dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600", label: "Low" };
    default: return { dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600", label: "Low" };
  }
}

export default async function ClientTicketsPage() {
  const user = await requireAuth();

  const ticketList = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      type: tickets.type,
      status: tickets.status,
      priority: tickets.priority,
      clientId: tickets.clientId,
      projectId: tickets.projectId,
      createdBy: tickets.createdBy,
      assignedTo: tickets.assignedTo,
      createdAt: tickets.createdAt,
      projectName: projects.name,
    })
    .from(tickets)
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(and(eq(tickets.clientId, user.clientId!), isNull(tickets.deletedAt)))
    .orderBy(desc(tickets.createdAt));

  const clientProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)));

  const clientObj = await db.query.clients.findFirst({
    where: eq(clients.id, user.clientId!),
  });
  const clientList = clientObj ? [{ id: clientObj.id, companyName: clientObj.companyName }] : [];

  const openTickets = ticketList.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_on_client");
  const resolvedTickets = ticketList.filter((t) => t.status === "resolved" || t.status === "closed");

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Support</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help Center</h1>
          </div>
          <div className="flex items-center gap-3">
            <CreateTicketDialog clients={clientList} projects={clientProjects} />
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">
        {/* FAQ Section */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-violet-600" strokeWidth={2} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2">
            {[
              { q: "How do I track my project progress?", a: "Visit the Projects page from the sidebar to see all your active projects. Each project has a detailed page showing the roadmap progress, current phase, and system health." },
              { q: "How do I access project files and documents?", a: "All project files are available on your project detail page. Click on any project, then scroll to the Files section." },
              { q: "What\u2019s the best way to communicate with my team?", a: "Use the Project Chat feature on each project page for quick questions. For more complex issues, submit a support ticket here." },
              { q: "How long does it take to get a response?", a: "Most support tickets receive an initial response within 4 business hours. Urgent issues are typically addressed within 1-2 hours." },
            ].map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all">
                  <span className="text-[13px] font-medium text-slate-800">{faq.q}</span>
                  <svg className="w-5 h-5 text-slate-400 group-open:text-violet-600 group-open:rotate-180 transition-all duration-200 flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 pt-2">
                  <p className="text-[13px] text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all">
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Open Tickets</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{openTickets.length}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-[18px] h-[18px] text-violet-600" strokeWidth={2} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-rose-200 hover:shadow-md hover:shadow-rose-500/5 transition-all">
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Awaiting Response</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{ticketList.filter((t) => t.status === "waiting_on_client").length}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
              <ShieldAlert className="w-[18px] h-[18px] text-rose-600" strokeWidth={2} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Resolved</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{resolvedTickets.length}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-[18px] h-[18px] text-emerald-600" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Active Queue */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-600" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">Active Requests</h2>
              <p className="text-[12px] text-slate-400">{openTickets.length} tickets</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {openTickets.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <DijiMascot variant="celebrating" size="sm" className="mb-3" />
                <p className="text-[13px] font-semibold text-slate-700">All Caught Up!</p>
                <p className="text-[12px] text-slate-400 mt-1">You have no pending requests.</p>
                <div className="mt-4">
                  <CreateTicketDialog clients={clientList} projects={clientProjects} />
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pl-8">Subject</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Project & Priority</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Status</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pr-8 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {openTickets.map((ticket) => {
                      const p = getPriorityConfig(ticket.priority);
                      return (
                        <tr key={ticket.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 pl-8">
                            <Link href={`/dashboard/client/tickets/${ticket.id}`} className="block">
                              <div className="flex items-start gap-3">
                                <div className="pt-1.5">
                                  <div className={cn("w-2.5 h-2.5 rounded-full", p.dot)} />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800 text-[13px] group-hover:text-violet-700 transition-colors">
                                    {ticket.title}
                                  </p>
                                  <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-1 max-w-[300px]">{ticket.description}</p>
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[13px] font-medium text-slate-700">{ticket.projectName || "General"}</span>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full w-fit", p.bg, p.text)}>
                                {p.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <TicketStatusBadge status={ticket.status} />
                          </td>
                          <td className="px-6 py-4 pr-8 text-right">
                            <span className="text-[12px] text-slate-500 font-medium">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Archive */}
        {resolvedTickets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-slate-500" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Resolved History</h2>
                <p className="text-[12px] text-slate-400">{resolvedTickets.length} resolved</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pl-8">Subject</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Project</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Status</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pr-8 text-right">Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {resolvedTickets.map((ticket) => (
                      <tr key={ticket.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 pl-8">
                          <Link href={`/dashboard/client/tickets/${ticket.id}`} className="block">
                            <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                              <p className="font-medium text-slate-700 text-[13px] group-hover:text-violet-700 transition-colors">
                                {ticket.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">#{ticket.id.slice(-4)}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[13px] font-medium text-slate-500 opacity-60 group-hover:opacity-100">{ticket.projectName || "General"}</span>
                        </td>
                        <td className="px-6 py-4 opacity-70 group-hover:opacity-100">
                          <TicketStatusBadge status={ticket.status} size="sm" />
                        </td>
                        <td className="px-6 py-4 pr-8 text-right">
                          <span className="text-[12px] text-slate-400">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
