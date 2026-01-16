import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import dynamicImport from "next/dynamic";
import { Ticket, AlertTriangle, Zap, TrendingUp, Clock, User, Building2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const CreateTicketDialog = dynamicImport(
  () => import("@/components/create-ticket-dialog").then((mod) => ({ default: mod.CreateTicketDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

// Helper functions for status and priority badges
function getStatusBadge(status: string) {
  const styles = {
    open: "badge-warning",
    in_progress: "badge-primary",
    waiting_on_client: "badge-info",
    resolved: "badge-success",
    closed: "badge-neutral",
  }[status] || "badge-neutral";

  const labels = {
    open: "Open",
    in_progress: "In Progress",
    waiting_on_client: "Waiting",
    resolved: "Resolved",
    closed: "Closed",
  }[status] || status;

  return <span className={styles}>{labels}</span>;
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
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-amber-500" />
              <span className="text-label text-amber-600">Support</span>
            </div>
            <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
              Support Queue
            </h1>
            <p className="text-slate-500 max-w-lg">
              Priority-sorted ticket queue across all active clients.
            </p>
          </div>
          <CreateTicketDialog clients={allClients} projects={allProjects} isAdmin />
        </header>

        {/* Priority Queue Sections */}
        {urgentTickets.length > 0 && (
          <section className="mb-8 animate-fade-in-up opacity-0 stagger-2">
            <div className="section-divider mb-4 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Urgent ({urgentTickets.length})</span>
            </div>
            <div className="space-y-3">
              {urgentTickets.map((ticket, i) => (
                <TicketRow key={ticket.id} ticket={ticket} index={i} />
              ))}
            </div>
          </section>
        )}

        {highPriorityTickets.length > 0 && (
          <section className="mb-8 animate-fade-in-up opacity-0 stagger-3">
            <div className="section-divider mb-4 text-orange-600">
              <Zap className="w-4 h-4" />
              <span>High Priority ({highPriorityTickets.length})</span>
            </div>
            <div className="space-y-3">
              {highPriorityTickets.map((ticket, i) => (
                <TicketRow key={ticket.id} ticket={ticket} index={i} />
              ))}
            </div>
          </section>
        )}

        {mediumPriorityTickets.length > 0 && (
          <section className="mb-8 animate-fade-in-up opacity-0 stagger-4">
            <div className="section-divider mb-4 text-blue-600">
              <TrendingUp className="w-4 h-4" />
              <span>Medium Priority ({mediumPriorityTickets.length})</span>
            </div>
            <div className="space-y-3">
              {mediumPriorityTickets.map((ticket, i) => (
                <TicketRow key={ticket.id} ticket={ticket} index={i} />
              ))}
            </div>
          </section>
        )}

        {lowPriorityTickets.length > 0 && (
          <section className="mb-8 animate-fade-in-up opacity-0 stagger-5">
            <div className="section-divider mb-4 text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Low Priority ({lowPriorityTickets.length})</span>
            </div>
            <div className="space-y-3">
              {lowPriorityTickets.map((ticket, i) => (
                <TicketRow key={ticket.id} ticket={ticket} index={i} />
              ))}
            </div>
          </section>
        )}

        {activeTickets.length === 0 && (
          <div className="card-elevated animate-fade-in-up opacity-0 stagger-2">
            <div className="empty-state">
              <Ticket className="empty-state-icon" />
              <h3 className="empty-state-title">All caught up!</h3>
              <p className="empty-state-description">
                No active support tickets at the moment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ticket Row Component
function TicketRow({ ticket, index }: { ticket: any; index: number }) {
  const priorityInfo = getPriorityInfo(ticket.priority);
  const PriorityIcon = priorityInfo.icon;

  return (
    <Link
      href={`/dashboard/admin/tickets/${ticket.id}`}
      className="card-elevated p-4 block group hover:border-violet-200 hover:shadow-md transition-all duration-200 animate-fade-in-up opacity-0"
      style={{ animationDelay: `${0.1 + index * 0.03}s` }}
    >
      <div className="flex items-start gap-4">
        {/* Priority Indicator */}
        <div className={`w-10 h-10 rounded-xl ${priorityInfo.bgColor} border ${priorityInfo.borderColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
          <PriorityIcon className={`w-5 h-5 ${priorityInfo.color}`} />
        </div>

        {/* Ticket Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-1">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(ticket.status)}
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-3 line-clamp-1 leading-relaxed">
            {ticket.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {ticket.clientName && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-medium text-slate-600">{ticket.clientName}</span>
              </div>
            )}
            {ticket.assigneeName ? (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
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
