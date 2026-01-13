import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { Ticket, AlertTriangle, Zap, TrendingUp, Clock, User, Building2, ExternalLink } from "lucide-react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

// Helper functions for status and priority badges
function getStatusBadge(status: string) {
  switch (status) {
    case "open":
      return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wider">Open</span>;
    case "in_progress":
      return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wider">In Progress</span>;
    case "waiting_on_client":
      return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200 uppercase tracking-wider">Waiting</span>;
    case "resolved":
      return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wider">Resolved</span>;
    case "closed":
      return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">Closed</span>;
    default:
      return null;
  }
}

function getPriorityInfo(priority: string) {
  switch (priority) {
    case "urgent":
      return { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200", label: "URGENT" };
    case "high":
      return { icon: Zap, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200", label: "HIGH" };
    case "medium":
      return { icon: TrendingUp, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200", label: "MEDIUM" };
    case "low":
      return { icon: Clock, color: "text-slate-500", bgColor: "bg-slate-50", borderColor: "border-slate-200", label: "LOW" };
    default:
      return { icon: Clock, color: "text-slate-500", bgColor: "bg-slate-50", borderColor: "border-slate-200", label: "NONE" };
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
    };
  });

  // Group by priority (urgent/high first)
  const urgentTickets = enrichedTickets.filter((t) => t.priority === "urgent" && (t.status === "open" || t.status === "in_progress"));
  const highPriorityTickets = enrichedTickets.filter((t) => t.priority === "high" && (t.status === "open" || t.status === "in_progress"));
  const mediumPriorityTickets = enrichedTickets.filter((t) => t.priority === "medium" && (t.status === "open" || t.status === "in_progress"));
  const lowPriorityTickets = enrichedTickets.filter((t) => t.priority === "low" && (t.status === "open" || t.status === "in_progress"));

  // Active (open + in progress) tickets
  const activeTickets = enrichedTickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_on_client");

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <Ticket className="w-7 h-7 text-indigo-600" />
              Support Queue
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              Priority-sorted ticket queue across all active clients.
            </p>
          </div>
          <CreateTicketDialog clients={allClients} projects={allProjects} isAdmin />
        </div>

        {/* Priority Queue Sections */}
        {urgentTickets.length > 0 && (
          <div className="mb-6 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <div className="flex items-center gap-2 mb-3 px-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h2 className="text-xs font-bold text-red-600 uppercase tracking-widest">
                Urgent ({urgentTickets.length})
              </h2>
            </div>
            <div className="space-y-2">
              {urgentTickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}

        {highPriorityTickets.length > 0 && (
          <div className="mb-6 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
            <div className="flex items-center gap-2 mb-3 px-3">
              <Zap className="w-4 h-4 text-orange-600" />
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                High Priority ({highPriorityTickets.length})
              </h2>
            </div>
            <div className="space-y-2">
              {highPriorityTickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}

        {mediumPriorityTickets.length > 0 && (
          <div className="mb-6 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.4s_both]">
            <div className="flex items-center gap-2 mb-3 px-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                Medium Priority ({mediumPriorityTickets.length})
              </h2>
            </div>
            <div className="space-y-2">
              {mediumPriorityTickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}

        {lowPriorityTickets.length > 0 && (
          <div className="mb-6 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.5s_both]">
            <div className="flex items-center gap-2 mb-3 px-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Low Priority ({lowPriorityTickets.length})
              </h2>
            </div>
            <div className="space-y-2">
              {lowPriorityTickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}

        {activeTickets.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-slate-600 text-lg font-medium mb-2">All caught up!</p>
            <p className="text-slate-400 text-sm">No active support tickets at the moment.</p>
          </div>
        )}
      </div>
    </>
  );
}

// Ticket Row Component
function TicketRow({ ticket }: { ticket: any }) {
  const priorityInfo = getPriorityInfo(ticket.priority);
  const PriorityIcon = priorityInfo.icon;

  return (
    <Link
      href={`/dashboard/admin/tickets/${ticket.id}`}
      className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        {/* Priority Indicator */}
        <div className={`w-10 h-10 rounded-lg ${priorityInfo.bgColor} border ${priorityInfo.borderColor} flex items-center justify-center flex-shrink-0`}>
          <PriorityIcon className={`w-5 h-5 ${priorityInfo.color}`} />
        </div>

        {/* Ticket Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(ticket.status)}
              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-3 line-clamp-1">
            {ticket.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {ticket.clientName && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                <span className="font-medium text-slate-600">{ticket.clientName}</span>
              </div>
            )}
            {ticket.assigneeName ? (
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                <span>{ticket.assigneeName}</span>
              </div>
            ) : (
              <span className="text-orange-600 font-medium">Unassigned</span>
            )}
            <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
