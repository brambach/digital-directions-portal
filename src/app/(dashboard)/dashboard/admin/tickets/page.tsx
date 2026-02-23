import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import dynamicImport from "next/dynamic";
import { Ticket, Filter, MessageSquare, ShieldAlert, CheckCircle, Clock, Zap, Circle, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { DigiMascot } from "@/components/digi-mascot";

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

export default async function AdminTicketsPage() {
  await requireAdmin();

  // Fetch all tickets with related data
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
    })
    .from(tickets)
    .leftJoin(clients, eq(tickets.clientId, clients.id))
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(isNull(tickets.deletedAt))
    .orderBy(desc(tickets.createdAt));

  // Fetch clients and projects for create dialog
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

  // Enrich tickets
  const enrichedTickets = ticketList.map((ticket) => {
    const creatorClerkId = ticket.createdBy ? dbUserMap.get(ticket.createdBy) : null;
    const assigneeClerkId = ticket.assignedTo ? dbUserMap.get(ticket.assignedTo) : null;

    const creatorClerk = creatorClerkId ? clerkUserMap.get(creatorClerkId) : null;
    const assigneeClerk = assigneeClerkId ? clerkUserMap.get(assigneeClerkId) : null;

    return {
      ...ticket,
      creatorName: creatorClerk
        ? `${creatorClerk.firstName || ""} ${creatorClerk.lastName || ""}`.trim() || "User"
        : "User",
      assigneeName: assigneeClerk
        ? `${assigneeClerk.firstName || ""} ${assigneeClerk.lastName || ""}`.trim()
        : null,
      assigneeAvatar: assigneeClerk?.imageUrl,
    };
  });

  const criticalTickets = enrichedTickets.filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "resolved" && t.status !== "closed");
  const standardTickets = enrichedTickets.filter((t) => (t.priority !== "urgent" && t.priority !== "high") && (t.status === "open" || t.status === "in_progress"));
  const resolvedTickets = enrichedTickets.filter((t) => t.status === "resolved" || t.status === "closed");

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Support</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Queue</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl font-medium text-slate-600 border-slate-200">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filter
            </Button>
            <CreateTicketDialog clients={allClients} projects={allProjects} isAdmin />
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all">
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Active Queue</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{criticalTickets.length + standardTickets.length}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-[18px] h-[18px] text-violet-600" strokeWidth={2} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-rose-200 hover:shadow-md hover:shadow-rose-500/5 transition-all">
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Critical & High</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{criticalTickets.length}</p>
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
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pl-8">Ticket Subject</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Client & Priority</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Status</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Assignee</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pr-8 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {criticalTickets.map((ticket) => {
                      const p = getPriorityConfig(ticket.priority);
                      return (
                        <tr key={ticket.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 pl-8">
                            <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
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
                              <span className="text-[13px] font-medium text-slate-700">{ticket.clientName}</span>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full w-fit", p.bg, p.text)}>
                                {p.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <TicketStatusBadge status={ticket.status} />
                          </td>
                          <td className="px-6 py-4">
                            {ticket.assigneeName ? (
                              <div className="flex items-center gap-2 max-w-[150px]">
                                {ticket.assigneeAvatar ? (
                                  <img src={ticket.assigneeAvatar} alt="" className="w-6 h-6 rounded-full border border-slate-200" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700">
                                    {ticket.assigneeName.charAt(0)}
                                  </div>
                                )}
                                <span className="text-[12px] text-slate-600 truncate">{ticket.assigneeName}</span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-400 italic">Unassigned</span>
                            )}
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
            </div>
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
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {standardTickets.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <DigiMascot variant="celebrating" size="sm" className="mb-3" />
                <p className="text-[13px] font-semibold text-slate-700">Queue Clear</p>
                <p className="text-[12px] text-slate-400 mt-1">No standard priority tickets pending.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pl-8">Ticket Subject</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Client & Priority</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Status</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Assignee</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pr-8 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {standardTickets.map((ticket) => {
                      const p = getPriorityConfig(ticket.priority);
                      return (
                        <tr key={ticket.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 pl-8">
                            <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
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
                              <span className="text-[13px] font-medium text-slate-700">{ticket.clientName}</span>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full w-fit", p.bg, p.text)}>
                                {p.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <TicketStatusBadge status={ticket.status} />
                          </td>
                          <td className="px-6 py-4">
                            {ticket.assigneeName ? (
                              <div className="flex items-center gap-2 max-w-[150px]">
                                {ticket.assigneeAvatar ? (
                                  <img src={ticket.assigneeAvatar} alt="" className="w-6 h-6 rounded-full border border-slate-200" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700">
                                    {ticket.assigneeName.charAt(0)}
                                  </div>
                                )}
                                <span className="text-[12px] text-slate-600 truncate">{ticket.assigneeName}</span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-400 italic">Unassigned</span>
                            )}
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
                <h2 className="text-[15px] font-bold text-slate-800">Resolution Archive</h2>
                <p className="text-[12px] text-slate-400">{resolvedTickets.length} resolved</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pl-8">Ticket Subject</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Client</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Status</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase">Resolved By</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase pr-8 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {resolvedTickets.map((ticket) => (
                      <tr key={ticket.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 pl-8">
                          <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
                            <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                              <p className="font-medium text-slate-700 text-[13px] group-hover:text-violet-700 transition-colors">
                                {ticket.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">#{ticket.id.slice(-4)}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[13px] font-medium text-slate-500 opacity-60 group-hover:opacity-100">{ticket.clientName}</span>
                        </td>
                        <td className="px-6 py-4 opacity-70 group-hover:opacity-100">
                          <TicketStatusBadge status={ticket.status} size="sm" />
                        </td>
                        <td className="px-6 py-4 opacity-70 group-hover:opacity-100">
                          <span className="text-[12px] text-slate-500 italic">{ticket.assignedTo ? "Assigned Agent" : "System"}</span>
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
