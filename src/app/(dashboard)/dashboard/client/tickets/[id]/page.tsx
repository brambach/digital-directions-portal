import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, users, ticketComments } from "@/lib/db/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  FolderKanban,
  Calendar,
  User,
  MessageSquare,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketTypeBadge,
} from "@/components/ticket-status-badge";
import { TicketCommentForm } from "@/components/ticket-comment-form";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ClientTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  if (!user.clientId) {
    notFound();
  }

  // Fetch ticket and verify ownership
  const ticket = await db
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
      resolvedAt: tickets.resolvedAt,
      resolution: tickets.resolution,
      createdAt: tickets.createdAt,
      projectName: projects.name,
    })
    .from(tickets)
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(
      and(
        eq(tickets.id, id),
        eq(tickets.clientId, user.clientId),
        isNull(tickets.deletedAt)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!ticket) {
    notFound();
  }

  // Fetch comments (excluding internal notes)
  const comments = await db
    .select({
      id: ticketComments.id,
      content: ticketComments.content,
      authorId: ticketComments.authorId,
      createdAt: ticketComments.createdAt,
    })
    .from(ticketComments)
    .where(
      and(
        eq(ticketComments.ticketId, id),
        eq(ticketComments.isInternal, false),
        isNull(ticketComments.deletedAt)
      )
    )
    .orderBy(desc(ticketComments.createdAt));

  // Get all user IDs
  const userIds = [
    ticket.createdBy,
    ticket.assignedTo,
    ...comments.map((c) => c.authorId),
  ].filter(Boolean) as string[];

  const uniqueUserIds = [...new Set(userIds)];

  // Fetch DB users
  const dbUsers =
    uniqueUserIds.length > 0
      ? await db
          .select({ id: users.id, clerkId: users.clerkId, role: users.role })
          .from(users)
          .where(or(...uniqueUserIds.map((uid) => eq(users.id, uid))))
      : [];

  const dbUserMap = new Map(
    dbUsers.map((u) => [u.id, { clerkId: u.clerkId, role: u.role }])
  );

  // Fetch Clerk users
  const clerk = await clerkClient();
  const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
  const clerkUsers =
    clerkIds.length > 0
      ? await Promise.all(
          clerkIds.map(async (cid) => {
            try {
              return await clerk.users.getUser(cid);
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

  const getUserInfo = (userId: string | null) => {
    if (!userId) return null;
    const dbUser = dbUserMap.get(userId);
    if (!dbUser) return { name: "User", avatar: null, role: null };
    const clerkUser = dbUser.clerkId ? clerkUserMap.get(dbUser.clerkId) : null;
    return {
      name: clerkUser
        ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "User"
        : "User",
      avatar: clerkUser?.imageUrl || null,
      role: dbUser.role,
    };
  };

  const assignee = getUserInfo(ticket.assignedTo);
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-10">
        {/* Back Button */}
        <Link
          href="/dashboard/client/tickets"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 mb-8 transition-colors animate-fade-in-up opacity-0 stagger-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Support
        </Link>

        {/* Ticket Header */}
        <div className="card-elevated p-8 mb-8 animate-fade-in-up opacity-0 stagger-1">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="text-display text-2xl text-slate-900">
              {ticket.title}
            </h1>
            <TicketStatusBadge status={ticket.status} size="md" />
            <TicketPriorityBadge priority={ticket.priority} size="md" />
            <TicketTypeBadge type={ticket.type} size="md" />
          </div>

          <p className="text-slate-600 whitespace-pre-wrap mb-6 leading-relaxed">
            {ticket.description}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            {ticket.projectName && (
              <Link
                href={`/dashboard/client/projects/${ticket.projectId}`}
                className="flex items-center gap-2 text-violet-600 hover:text-violet-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">{ticket.projectName}</span>
              </Link>
            )}
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <span>
                Submitted{" "}
                {formatDistanceToNow(new Date(ticket.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Comments */}
          <div className="lg:col-span-2 space-y-6">
            <section className="animate-fade-in-up opacity-0 stagger-2">
              <div className="section-divider mb-4">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span>Conversation</span>
              </div>

              {!isResolved && (
                <div className="card-elevated p-4 mb-4">
                  <TicketCommentForm ticketId={id} />
                </div>
              )}

              {comments.length === 0 ? (
                <div className="card-elevated">
                  <div className="empty-state py-8">
                    <MessageSquare className="empty-state-icon" />
                    <h3 className="empty-state-title">No replies yet</h3>
                    <p className="empty-state-description">
                      Our team will respond to your ticket shortly.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment, index) => {
                    const author = getUserInfo(comment.authorId);
                    const isAdmin = author?.role === "admin";
                    return (
                      <div
                        key={comment.id}
                        className={`card-elevated p-4 animate-fade-in-up opacity-0 ${isAdmin ? "border-l-2 border-l-violet-400" : ""}`}
                        style={{ animationDelay: `${0.15 + index * 0.05}s` }}
                      >
                        <div className="flex items-start gap-3">
                          {author?.avatar ? (
                            <Image
                              src={author.avatar}
                              alt={author.name}
                              width={36}
                              height={36}
                              className="rounded-xl flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-semibold text-slate-900">
                                {author?.name}
                              </span>
                              {isAdmin && (
                                <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">
                                  Digital Directions
                                </span>
                              )}
                              <span className="text-xs text-slate-400">
                                {formatDistanceToNow(
                                  new Date(comment.createdAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <section className="animate-fade-in-up opacity-0 stagger-2">
              <div className="section-divider mb-4">
                <Info className="w-4 h-4 text-slate-500" />
                <span>Details</span>
              </div>

              <div className="card-elevated p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-label text-slate-500 mb-1.5">
                      Assigned to
                    </p>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        {assignee.avatar ? (
                          <Image
                            src={assignee.avatar}
                            alt={assignee.name}
                            width={28}
                            height={28}
                            className="rounded-lg"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-900">
                          {assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500 italic">
                        Awaiting assignment
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-label text-slate-500 mb-1.5">Status</p>
                    <TicketStatusBadge status={ticket.status} />
                  </div>

                  <div>
                    <p className="text-label text-slate-500 mb-1.5">Priority</p>
                    <TicketPriorityBadge priority={ticket.priority} />
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-label text-slate-500 mb-1">Submitted</p>
                    <p className="text-sm text-slate-700">
                      {format(
                        new Date(ticket.createdAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>

                  {ticket.resolvedAt && (
                    <div>
                      <p className="text-label text-slate-500 mb-1">Resolved</p>
                      <p className="text-sm text-slate-700">
                        {format(
                          new Date(ticket.resolvedAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {ticket.resolution && (
              <div className="card-elevated p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100 animate-fade-in-up opacity-0 stagger-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-heading text-emerald-900">Resolution</h3>
                </div>
                <p className="text-sm text-emerald-800 whitespace-pre-wrap leading-relaxed">
                  {ticket.resolution}
                </p>
              </div>
            )}

            {ticket.status === "waiting_on_client" && (
              <div className="card-elevated p-5 bg-gradient-to-br from-amber-50 to-white border-amber-100 animate-fade-in-up opacity-0 stagger-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-heading text-amber-900">
                    Action Required
                  </h3>
                </div>
                <p className="text-sm text-amber-800">
                  We&apos;re waiting for your response. Please add a comment
                  above to continue.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
