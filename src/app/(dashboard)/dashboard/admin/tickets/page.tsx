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

const CreateTicketDialog = dynamicImport(
  () => import("@/components/create-ticket-dialog").then((mod) => ({ default: mod.CreateTicketDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent": return "text-red-600 bg-red-50 border-red-100";
    case "high": return "text-amber-600 bg-amber-50 border-amber-100";
    case "medium": return "text-sky-600 bg-sky-50 border-sky-100";
    case "low": return "text-slate-600 bg-slate-50 border-slate-100";
    default: return "text-slate-600 bg-slate-50 border-slate-100";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "open": return "bg-emerald-500";
    case "in_progress": return "bg-purple-700";
    case "resolved": return "bg-slate-400";
    case "closed": return "bg-slate-300";
    default: return "bg-slate-400";
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
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Support Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and resolve client support requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-xl font-semibold text-gray-500 border-gray-100 bg-white">
            <Filter className="w-3.5 h-3.5 mr-2" />
            Filter
          </Button>
          <CreateTicketDialog clients={allClients} projects={allProjects} isAdmin />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter delay-100">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-purple-100 transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Queue</p>
            <p className="text-2xl font-bold text-gray-900">{criticalTickets.length + standardTickets.length}</p>
          </div>
          <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-700 group-hover:bg-purple-100 transition-colors">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-100 transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Critical & High</p>
            <p className="text-2xl font-bold text-gray-900">{criticalTickets.length}</p>
          </div>
          <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-emerald-100 transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resolved (Total)</p>
            <p className="text-2xl font-bold text-gray-900">{resolvedTickets.length}</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-100 transition-colors">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Priority Queue Section (Only shows if there are urgent/high tickets) */}
      {criticalTickets.length > 0 && (
        <div className="animate-enter delay-200 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Priority Attention Required</h2>
          </div>
          <Card className="rounded-xl border-red-200 shadow-[0_4px_20px_rgba(220,38,38,0.1)] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-red-50 bg-red-50/50 text-left">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-8">Ticket Subject</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client & Priority</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assignee</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-8 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {criticalTickets.map((ticket) => (
                    <tr key={ticket.id} className="group hover:bg-red-50/20 transition-colors">
                      <td className="px-6 py-4 pl-8">
                        <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
                          <div className="flex items-start gap-4">
                            <div className="pt-1.5 flex flex-col items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm group-hover:text-red-600 transition-colors">
                                {ticket.title}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[300px]">{ticket.description}</p>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold text-gray-700">{ticket.clientName}</span>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide w-fit border", getPriorityColor(ticket.priority))}>
                            {ticket.priority}
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
                              <img src={ticket.assigneeAvatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                {ticket.assigneeName.charAt(0)}
                              </div>
                            )}
                            <span className="text-xs text-gray-600 truncate">{ticket.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 pr-8 text-right bg-transparent">
                        <span className="text-xs text-gray-900 font-bold">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Main Standard Queue */}
      <div className="animate-enter delay-300 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Zap className="w-4 h-4 text-purple-700" />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Standard Queue</h2>
        </div>
        <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden bg-white">
          {standardTickets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-900">Queue Clear</p>
              <p className="text-xs text-gray-400 mt-1">No standard priority tickets pending.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-purple-50/10 text-left">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-8">Ticket Subject</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client & Priority</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assignee</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-8 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {standardTickets.map((ticket) => (
                    <tr key={ticket.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 pl-8">
                        <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
                          <div className="flex items-start gap-4">
                            <div className="pt-1.5 flex flex-col items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-700/20" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors">
                                {ticket.title}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[300px]">{ticket.description}</p>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold text-gray-700">{ticket.clientName}</span>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide w-fit border", getPriorityColor(ticket.priority))}>
                            {ticket.priority}
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
                              <img src={ticket.assigneeAvatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                {ticket.assigneeName.charAt(0)}
                              </div>
                            )}
                            <span className="text-xs text-gray-600 truncate">{ticket.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 pr-8 text-right bg-transparent">
                        <span className="text-xs text-gray-600 font-medium">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {resolvedTickets.length > 0 && (
        <div className="animate-enter delay-400 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Resolution Archive</h2>
          </div>
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden bg-gray-50/30">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 text-left">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest pl-8">Ticket Subject</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Client</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Resolved By</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest pr-8 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resolvedTickets.map((ticket) => (
                    <tr key={ticket.id} className="group hover:bg-white transition-colors">
                      <td className="px-6 py-4 pl-8">
                        <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
                          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                            <p className="font-bold text-gray-700 text-sm group-hover:text-purple-700 transition-colors">
                              {ticket.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[300px]">#{ticket.id.slice(-4)}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-500 opacity-60 group-hover:opacity-100">{ticket.clientName}</span>
                      </td>
                      <td className="px-6 py-4 opacity-70 group-hover:opacity-100">
                        <TicketStatusBadge status={ticket.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 opacity-70 group-hover:opacity-100">
                        {/* We didn't fetch resolver name in the list, so fallback to Assignee or User */}
                        <span className="text-xs text-gray-400 italic">{ticket.assignedTo ? "Assigned Agent" : "System"}</span>
                      </td>
                      <td className="px-6 py-4 pr-8 text-right bg-transparent">
                        <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

    </div >
  );
}
