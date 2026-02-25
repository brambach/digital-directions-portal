import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import dynamicImport from "next/dynamic";
import { ArrowRight, CheckCircle, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { DigiMascot } from "@/components/digi-mascot";
import { Card } from "@/components/ui/card";
import { OpenDigiButton } from "@/components/open-digi-button";

const CreateTicketDialog = dynamicImport(
  () => import("@/components/create-ticket-dialog").then((mod) => ({ default: mod.CreateTicketDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

function getPriorityConfig(priority: string) {
  switch (priority) {
    case "urgent": return { dot: "bg-red-500", ring: "ring-red-500/20", bg: "bg-red-50", text: "text-red-700", label: "Urgent" };
    case "high": return { dot: "bg-orange-500", ring: "ring-orange-500/20", bg: "bg-orange-50", text: "text-orange-700", label: "High" };
    case "medium": return { dot: "bg-sky-500", ring: "ring-sky-500/20", bg: "bg-sky-50", text: "text-sky-700", label: "Medium" };
    case "low": return { dot: "bg-slate-400", ring: "ring-slate-400/20", bg: "bg-slate-100", text: "text-slate-600", label: "Low" };
    default: return { dot: "bg-slate-400", ring: "ring-slate-400/20", bg: "bg-slate-100", text: "text-slate-600", label: "Low" };
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case "open": return "Submitted";
    case "in_progress": return "Being worked on";
    case "waiting_on_client": return "Needs your reply";
    case "resolved": return "Resolved";
    case "closed": return "Closed";
    default: return status;
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
  const awaitingResponse = ticketList.filter((t) => t.status === "waiting_on_client");

  const hasTickets = ticketList.length > 0;

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Support</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help Centre</h1>
          </div>
          {/* Hidden CreateTicketDialog — still rendered for Digi escalation auto-open */}
          <div className="hidden">
            <CreateTicketDialog clients={clientList} projects={clientProjects} />
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">

        {/* Digi Hero CTA */}
        <Card className="rounded-2xl border-slate-100 overflow-hidden bg-gradient-to-br from-white via-white to-violet-50/40">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <DigiMascot variant="neutral" size="sm" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Need help? Chat with Digi first</h2>
              <p className="text-[13px] text-slate-500 leading-relaxed max-w-md">
                Digi can answer most questions instantly — from project updates to integration help.
                If Digi can&apos;t resolve your issue, it&apos;ll create a support ticket for you automatically.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <OpenDigiButton />
                <span className="text-[12px] text-slate-400">or</span>
                <CreateTicketDialog clients={clientList} projects={clientProjects} />
              </div>
            </div>
          </div>
        </Card>

        {/* Stats — only show if they have ticket history */}
        {hasTickets && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 rounded-2xl border-slate-100 flex items-center justify-between hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all">
              <div>
                <p className="text-[13px] font-medium text-slate-500 mb-1">Active Requests</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{openTickets.length}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <Zap className="w-[18px] h-[18px] text-violet-600" strokeWidth={2} />
              </div>
            </Card>
            <Card className={cn("p-5 rounded-2xl border-slate-100 flex items-center justify-between transition-all", awaitingResponse.length > 0 ? "hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/5 border-amber-100" : "hover:border-slate-200")}>
              <div>
                <p className="text-[13px] font-medium text-slate-500 mb-1">Needs Your Reply</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{awaitingResponse.length}</p>
              </div>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", awaitingResponse.length > 0 ? "bg-amber-100" : "bg-slate-100")}>
                <Clock className={cn("w-[18px] h-[18px]", awaitingResponse.length > 0 ? "text-amber-600" : "text-slate-400")} strokeWidth={2} />
              </div>
            </Card>
            <Card className="p-5 rounded-2xl border-slate-100 flex items-center justify-between hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
              <div>
                <p className="text-[13px] font-medium text-slate-500 mb-1">Resolved</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{resolvedTickets.length}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-[18px] h-[18px] text-emerald-600" strokeWidth={2} />
              </div>
            </Card>
          </div>
        )}

        {/* Active Requests */}
        {openTickets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-violet-600" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Active Requests</h2>
                <p className="text-[12px] text-slate-400">{openTickets.length} open</p>
              </div>
            </div>
            <Card className="rounded-2xl border-slate-100 overflow-hidden divide-y divide-slate-50">
              {openTickets.map((ticket) => {
                const p = getPriorityConfig(ticket.priority);
                const needsReply = ticket.status === "waiting_on_client";
                return (
                  <Link key={ticket.id} href={`/dashboard/client/tickets/${ticket.id}`} className="block">
                    <div className={cn("px-6 py-4 hover:bg-slate-50/80 transition-colors group flex items-center gap-4", needsReply && "bg-amber-50/30")}>
                      {/* Priority dot */}
                      <div className={cn("w-2.5 h-2.5 rounded-full ring-4 flex-shrink-0", p.dot, p.ring)} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-slate-800 text-[13px] group-hover:text-violet-700 transition-colors truncate">
                            {ticket.title}
                          </p>
                          {needsReply && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                              Needs reply
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-slate-400">
                          <span>{ticket.projectName || "General"}</span>
                          <span className="text-slate-200">|</span>
                          <span>{getStatusDescription(ticket.status)}</span>
                        </div>
                      </div>

                      {/* Priority badge + time */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", p.bg, p.text)}>
                          {p.label}
                        </span>
                        <span className="text-[12px] text-slate-400 font-medium min-w-[80px] text-right">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </Card>
          </div>
        )}

        {/* Empty state — no open tickets */}
        {openTickets.length === 0 && (
          <Card className="rounded-2xl border-slate-100">
            <div className="py-14 text-center flex flex-col items-center">
              <DigiMascot variant="celebrating" size="sm" className="mb-3" />
              <p className="text-[15px] font-bold text-slate-800">You&apos;re all caught up!</p>
              <p className="text-[13px] text-slate-400 mt-1 max-w-sm">
                No open support requests. If something comes up, start by chatting with Digi.
              </p>
            </div>
          </Card>
        )}

        {/* Resolved History */}
        {resolvedTickets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-slate-500" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Resolved</h2>
                <p className="text-[12px] text-slate-400">{resolvedTickets.length} past requests</p>
              </div>
            </div>
            <Card className="rounded-2xl border-slate-100 overflow-hidden divide-y divide-slate-50">
              {resolvedTickets.map((ticket) => (
                <Link key={ticket.id} href={`/dashboard/client/tickets/${ticket.id}`} className="block">
                  <div className="px-6 py-4 hover:bg-slate-50/80 transition-colors group flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-600 text-[13px] group-hover:text-violet-700 transition-colors truncate">
                        {ticket.title}
                      </p>
                      <p className="text-[12px] text-slate-400 mt-0.5">{ticket.projectName || "General"}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <TicketStatusBadge status={ticket.status} size="sm" />
                      <span className="text-[12px] text-slate-400 min-w-[80px] text-right">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
