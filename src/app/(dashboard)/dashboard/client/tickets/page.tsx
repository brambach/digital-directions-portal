import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { TicketList } from "@/components/ticket-card";
import dynamicImport from "next/dynamic";
import {
  Ticket,
  CheckCircle,
  AlertCircle,
  Clock,
  Headphones,
} from "lucide-react";

const CreateTicketDialog = dynamicImport(
  () => import("@/components/create-ticket-dialog").then((mod) => ({ default: mod.CreateTicketDialog })),
  { loading: () => null }
);

export const dynamic = "force-dynamic";

export default async function ClientTicketsPage() {
  const user = await requireAuth();

  if (!user.clientId) {
    return (
      <div className="min-h-screen bg-[#FAFBFC]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-10">
          <div className="card-elevated p-8 text-center border-amber-100 bg-amber-50/50">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-heading text-lg text-slate-900 mb-2">
              Access Restricted
            </h2>
            <p className="text-slate-500">
              You don&apos;t have access to support tickets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch client's tickets
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
    .where(and(eq(tickets.clientId, user.clientId), isNull(tickets.deletedAt)))
    .orderBy(desc(tickets.createdAt));

  // Fetch client's projects for create dialog
  const clientProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(
      and(eq(projects.clientId, user.clientId), isNull(projects.deletedAt))
    );

  // Fetch Clerk user info
  const userIds = [
    ...new Set(
      [
        ...ticketList.map((t) => t.createdBy),
        ...ticketList.map((t) => t.assignedTo),
      ].filter(Boolean)
    ),
  ] as string[];

  const dbUsers =
    userIds.length > 0
      ? await db
          .select({ id: users.id, clerkId: users.clerkId })
          .from(users)
          .where(or(...userIds.map((id) => eq(users.id, id))))
      : [];

  const dbUserMap = new Map(dbUsers.map((u) => [u.id, u.clerkId]));

  const clerk = await clerkClient();
  const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
  const clerkUsers =
    clerkIds.length > 0
      ? await Promise.all(
          clerkIds.map(async (id) => {
            try {
              return await clerk.users.getUser(id);
            } catch {
              return null;
            }
          })
        )
      : [];

  const clerkUserMap = new Map(
    clerkUsers
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  // Enrich tickets
  const enrichedTickets = ticketList.map((ticket) => {
    const creatorClerkId = ticket.createdBy
      ? dbUserMap.get(ticket.createdBy)
      : null;
    const assigneeClerkId = ticket.assignedTo
      ? dbUserMap.get(ticket.assignedTo)
      : null;

    const creatorClerk = creatorClerkId
      ? clerkUserMap.get(creatorClerkId)
      : null;
    const assigneeClerk = assigneeClerkId
      ? clerkUserMap.get(assigneeClerkId)
      : null;

    return {
      ...ticket,
      clientName: null, // Client doesn't need to see their own name
      creatorName: creatorClerk
        ? `${creatorClerk.firstName || ""} ${creatorClerk.lastName || ""}`.trim() ||
          "You"
        : "You",
      assigneeName: assigneeClerk
        ? `${assigneeClerk.firstName || ""} ${assigneeClerk.lastName || ""}`.trim()
        : null,
    };
  });

  // Group tickets
  const activeTickets = enrichedTickets.filter(
    (t) =>
      t.status === "open" ||
      t.status === "in_progress" ||
      t.status === "waiting_on_client"
  );
  const resolvedTickets = enrichedTickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  );

  // Stats
  const waitingOnClient = enrichedTickets.filter(
    (t) => t.status === "waiting_on_client"
  ).length;
  const inProgress = enrichedTickets.filter(
    (t) => t.status === "in_progress"
  ).length;

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="w-4 h-4 text-violet-500" />
              <span className="text-label text-violet-600">Support</span>
            </div>
            <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
              Support Tickets
            </h1>
            <p className="text-slate-500 max-w-lg">
              Track your support requests and communicate with the Digital
              Directions team.
            </p>
          </div>
          <CreateTicketDialog
            projects={clientProjects}
            defaultClientId={user.clientId}
          />
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-in-up opacity-0 stagger-2">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div className="stat-value">{ticketList.length}</div>
            <div className="stat-label">Total Tickets</div>
          </div>

          <div className="stat-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <div className="stat-value text-violet-700">
                {activeTickets.length}
              </div>
              <div className="stat-label">Active</div>
            </div>
          </div>

          {waitingOnClient > 0 && (
            <div className="stat-card relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <div className="stat-value text-amber-700">{waitingOnClient}</div>
                <div className="stat-label">Needs Response</div>
              </div>
            </div>
          )}

          <div className="stat-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="stat-value text-emerald-700">
                {resolvedTickets.length}
              </div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>
        </div>

        {/* Active Tickets */}
        <section className="mb-10 animate-fade-in-up opacity-0 stagger-3">
          <div className="section-divider mb-6">
            <Clock className="w-4 h-4 text-violet-500" />
            <span>Active Tickets ({activeTickets.length})</span>
          </div>
          <TicketList
            tickets={activeTickets}
            basePath="/dashboard/client/tickets"
            showClient={false}
            emptyMessage="No active tickets. Create one if you need help!"
          />
        </section>

        {/* Resolved Tickets */}
        {resolvedTickets.length > 0 && (
          <section className="animate-fade-in-up opacity-0 stagger-4">
            <div className="section-divider mb-6">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Resolved ({resolvedTickets.length})</span>
            </div>
            <TicketList
              tickets={resolvedTickets}
              basePath="/dashboard/client/tickets"
              showClient={false}
            />
          </section>
        )}
      </div>
    </div>
  );
}
