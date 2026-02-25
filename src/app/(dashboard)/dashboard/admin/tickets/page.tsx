import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import dynamicImport from "next/dynamic";
import { MessageSquare, ShieldAlert, CheckCircle, Clock, Zap, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { DigiFloat } from "@/components/motion/digi-float";
import { Badge } from "@/components/ui/badge";

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

export default async function AdminTicketsPage() {
  await requireAdmin();

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
      clientName: clients.companyName,
      projectName: projects.name,
      freshdeskUrl: tickets.freshdeskUrl,
    })
    .from(tickets)
    .leftJoin(clients, eq(tickets.clientId, clients.id))
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(isNull(tickets.deletedAt))
    .orderBy(desc(tickets.createdAt));

  const [allClients, allProjects] = await Promise.all([
    db
      .select({ id: clients.id, companyName: clients.companyName })
      .from(clients)
      .where(and(isNull(clients.deletedAt), eq(clients.status, "active"))),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(isNull(projects.deletedAt)),
  ]);

  // Fetch Clerk user info
  const userIds = [
    ...new Set([
      ...ticketList.map((t) => t.createdBy),
      ...ticketList.map((t) => t.assignedTo),
    ].filter(Boolean)),
  ] as string[];

  const dbUsers = userIds.length > 0
    ? await db
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(or(...userIds.map((id) => eq(users.id, id))))
    : [];

  const dbUserMap = new Map(dbUsers.map((u) => [u.id, u.clerkId]));

  const clerk = await clerkClient();
  const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
  const clerkUsers = clerkIds.length > 0
    ? await Promise.all(clerkIds.map(async (id) => {
      try {
        return await clerk.users.getUser(id);
      } catch {
        return null;
      }
    }))
    : [];

  const clerkUserMap = new Map(
    clerkUsers
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  const enrichedTickets = ticketList.map((ticket) => {
    const creatorClerkId = ticket.createdBy ? dbUserMap.get(ticket.createdBy) : null;
    const assigneeClerkId = ticket.assignedTo ? dbUserMap.get(ticket.assignedTo) : null;
    const assigneeClerk = assigneeClerkId ? clerkUserMap.get(assigneeClerkId) : null;

    return {
      ...ticket,
      assigneeName: assigneeClerk
        ? `${assigneeClerk.firstName || ""} ${assigneeClerk.lastName || ""}`.trim()
        : null,
      assigneeAvatar: assigneeClerk?.imageUrl,
    };
  });

  const criticalTickets = enrichedTickets.filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "resolved" && t.status !== "closed");
  const standardTickets = enrichedTickets.filter((t) => (t.priority !== "urgent" && t.priority !== "high") && (t.status === "open" || t.status === "in_progress" || t.status === "waiting_on_client"));
  const resolvedTickets = enrichedTickets.filter((t) => t.status === "resolved" || t.status === "closed");

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Support</p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Queue</h1>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold text-slate-400 border-slate-200 rounded-full px-2.5 py-0.5 ml-1 self-end mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block" />
              Freshdesk Synced
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <CreateTicketDialog clients={allClients} projects={allProjects} isAdmin />
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 rounded-2xl border-slate-100 flex items-center justify-between hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all">
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Active Queue</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{criticalTickets.length + standardTickets.length}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-[18px] h-[18px] text-violet-600" strokeWidth={2} />
            </div>
          </Card>
          <Card className={cn("p-5 rounded-2xl border-slate-100 flex items-center justify-between transition-all", criticalTickets.length > 0 ? "hover:border-rose-200 hover:shadow-md hover:shadow-rose-500/5 border-rose-100" : "hover:border-slate-200")}>
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Critical & High</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{criticalTickets.length}</p>
            </div>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", criticalTickets.length > 0 ? "bg-rose-100" : "bg-slate-100")}>
              <ShieldAlert className={cn("w-[18px] h-[18px]", criticalTickets.length > 0 ? "text-rose-600" : "text-slate-400")} strokeWidth={2} />
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

        {/* Priority Queue Section */}
        {criticalTickets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-rose-600" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Priority Attention Required</h2>
                <p className="text-[12px] text-slate-400">{criticalTickets.length} urgent/high tickets</p>
              </div>
            </div>
            <Card className="rounded-2xl border-slate-100 overflow-hidden divide-y divide-slate-50">
              {criticalTickets.map((ticket) => {
                const p = getPriorityConfig(ticket.priority);
                const isUrgent = ticket.priority === "urgent";
                return (
                  <div key={ticket.id} className={cn("group hover:bg-slate-50/80 transition-colors relative", isUrgent && "border-l-[3px] border-l-red-500")}>
                    <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
                      <div className="px-6 py-4 flex items-center gap-4">
                        <div className={cn("w-2.5 h-2.5 rounded-full ring-4 flex-shrink-0", p.dot, p.ring, isUrgent && "animate-pulse")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-slate-800 text-[13px] group-hover:text-violet-700 transition-colors truncate">
                              {ticket.title}
                            </p>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", p.bg, p.text)}>
                              {p.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-slate-400">
                            <span className="font-medium text-slate-600">{ticket.clientName}</span>
                            {ticket.projectName && (
                              <>
                                <span className="text-slate-200">|</span>
                                <span>{ticket.projectName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <TicketStatusBadge status={ticket.status} size="sm" />
                          {ticket.assigneeName ? (
                            <div className="flex items-center gap-1.5">
                              {ticket.assigneeAvatar ? (
                                <img src={ticket.assigneeAvatar} alt="" className="w-5 h-5 rounded-full border border-slate-200" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[9px] font-bold text-violet-700">
                                  {ticket.assigneeName.charAt(0)}
                                </div>
                              )}
                              <span className="text-[12px] text-slate-500 max-w-[80px] truncate">{ticket.assigneeName}</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400 italic">Unassigned</span>
                          )}
                          <span className="text-[12px] text-slate-400 font-medium min-w-[70px] text-right">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {/* Freshdesk link on hover */}
                        {ticket.freshdeskUrl && (
                          <a
                            href={ticket.freshdeskUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-violet-600" />
                          </a>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* Standard Queue */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-600" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">Standard Queue</h2>
              <p className="text-[12px] text-slate-400">{standardTickets.length} tickets</p>
            </div>
          </div>
          <Card className="rounded-2xl border-slate-100 overflow-hidden">
            {standardTickets.length === 0 ? (
              <div className="py-14 text-center flex flex-col items-center">
                <DigiFloat variant="celebrating" size="sm" className="mb-3" />
                <p className="text-[13px] font-semibold text-slate-700">Queue Clear</p>
                <p className="text-[12px] text-slate-400 mt-1">No standard priority tickets pending.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {standardTickets.map((ticket) => {
                  const p = getPriorityConfig(ticket.priority);
                  return (
                    <div key={ticket.id} className="group hover:bg-slate-50/80 transition-colors relative">
                      <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
                        <div className="px-6 py-4 flex items-center gap-4">
                          <div className={cn("w-2.5 h-2.5 rounded-full ring-4 flex-shrink-0", p.dot, p.ring)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-slate-800 text-[13px] group-hover:text-violet-700 transition-colors truncate">
                                {ticket.title}
                              </p>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", p.bg, p.text)}>
                                {p.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-slate-400">
                              <span className="font-medium text-slate-600">{ticket.clientName}</span>
                              {ticket.projectName && (
                                <>
                                  <span className="text-slate-200">|</span>
                                  <span>{ticket.projectName}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <TicketStatusBadge status={ticket.status} size="sm" />
                            {ticket.assigneeName ? (
                              <div className="flex items-center gap-1.5">
                                {ticket.assigneeAvatar ? (
                                  <img src={ticket.assigneeAvatar} alt="" className="w-5 h-5 rounded-full border border-slate-200" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[9px] font-bold text-violet-700">
                                    {ticket.assigneeName.charAt(0)}
                                  </div>
                                )}
                                <span className="text-[12px] text-slate-500 max-w-[80px] truncate">{ticket.assigneeName}</span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-400 italic">Unassigned</span>
                            )}
                            <span className="text-[12px] text-slate-400 font-medium min-w-[70px] text-right">
                              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          {ticket.freshdeskUrl && (
                            <a
                              href={ticket.freshdeskUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-violet-600" />
                            </a>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Resolution Archive */}
        {resolvedTickets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-slate-500" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Resolution Archive</h2>
                <p className="text-[12px] text-slate-400">{resolvedTickets.length} resolved</p>
              </div>
            </div>
            <Card className="rounded-2xl border-slate-100 overflow-hidden divide-y divide-slate-50">
              {resolvedTickets.map((ticket) => (
                <div key={ticket.id} className="group hover:bg-slate-50/80 transition-colors relative">
                  <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
                    <div className="px-6 py-4 flex items-center gap-4 opacity-60 group-hover:opacity-100 transition-opacity">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 text-[13px] group-hover:text-violet-700 transition-colors truncate">
                          {ticket.title}
                        </p>
                        <div className="flex items-center gap-2 text-[12px] text-slate-400 mt-0.5">
                          <span>{ticket.clientName}</span>
                          <span className="text-slate-200">|</span>
                          <span>#{ticket.id.slice(-4)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <TicketStatusBadge status={ticket.status} size="sm" />
                        {ticket.assigneeName ? (
                          <span className="text-[12px] text-slate-500">{ticket.assigneeName}</span>
                        ) : (
                          <span className="text-[12px] text-slate-400 italic">System</span>
                        )}
                        <span className="text-[12px] text-slate-400 min-w-[70px] text-right">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {ticket.freshdeskUrl && (
                        <a
                          href={ticket.freshdeskUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-violet-600" />
                        </a>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
