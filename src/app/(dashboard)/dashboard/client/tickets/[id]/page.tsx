import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, ticketComments, projects, users } from "@/lib/db/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, CheckCircle, Clock, User, MessageSquare } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeBadge } from "@/components/ticket-status-badge";
import { TicketCommentForm } from "@/components/ticket-comment-form";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getStatusMessage(status: string) {
  switch (status) {
    case "open": return { label: "Submitted", description: "Your request has been received and will be reviewed shortly.", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", icon: "amber" };
    case "in_progress": return { label: "We're working on this", description: "A team member is actively looking into your request.", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100", icon: "violet" };
    case "waiting_on_client": return { label: "We need your input", description: "We've replied and need more information from you to continue.", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", icon: "amber" };
    case "resolved": return { label: "Resolved", description: "This issue has been resolved.", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", icon: "emerald" };
    case "closed": return { label: "Closed", description: "This request is closed.", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", icon: "slate" };
    default: return { label: status, description: "", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", icon: "slate" };
  }
}

export default async function ClientTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireAuth();
  const { id } = await params;

  const ticket = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      type: tickets.type,
      status: tickets.status,
      priority: tickets.priority,
      projectId: tickets.projectId,
      createdBy: tickets.createdBy,
      assignedTo: tickets.assignedTo,
      resolvedAt: tickets.resolvedAt,
      resolvedBy: tickets.resolvedBy,
      resolution: tickets.resolution,
      createdAt: tickets.createdAt,
      projectName: projects.name,
    })
    .from(tickets)
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(and(eq(tickets.id, id), eq(tickets.clientId, currentUser.clientId || ""), isNull(tickets.deletedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!ticket) {
    notFound();
  }

  // Fetch comments (exclude internal notes)
  const comments = await db
    .select({
      id: ticketComments.id,
      content: ticketComments.content,
      authorId: ticketComments.authorId,
      createdAt: ticketComments.createdAt,
    })
    .from(ticketComments)
    .where(and(eq(ticketComments.ticketId, id), isNull(ticketComments.deletedAt), eq(ticketComments.isInternal, false)))
    .orderBy(desc(ticketComments.createdAt));

  // Get user info
  const userIds = [
    ticket.createdBy,
    ticket.assignedTo,
    ticket.resolvedBy,
    ...comments.map((c) => c.authorId),
  ].filter(Boolean) as string[];

  const uniqueUserIds = [...new Set(userIds)];

  const dbUsers = uniqueUserIds.length > 0
    ? await db
      .select({ id: users.id, clerkId: users.clerkId, role: users.role })
      .from(users)
      .where(or(...uniqueUserIds.map((uid) => eq(users.id, uid))))
    : [];

  const clerk = await clerkClient();
  const clerkIds = [...new Set(dbUsers.map(u => u.clerkId).filter(Boolean))];
  const clerkUsers = clerkIds.length > 0
    ? await Promise.all(clerkIds.map(async id => { try { return await clerk.users.getUser(id!) } catch { return null } }))
    : [];

  const clerkUserMap = new Map(clerkUsers.filter(u => u).map(u => [u!.id, u]));
  const dbUserMap = new Map(dbUsers.map(u => [u.id, u]));

  const getUserInfo = (userId: string | null) => {
    if (!userId) return { name: "Support Team", avatar: null, isStaff: true };
    const dbU = dbUserMap.get(userId);
    if (!dbU) return { name: "User", avatar: null, isStaff: false };
    const clerkU = dbU.clerkId ? clerkUserMap.get(dbU.clerkId) : null;
    return {
      name: clerkU ? `${clerkU.firstName} ${clerkU.lastName}`.trim() : "User",
      avatar: clerkU?.imageUrl || null,
      isStaff: dbU.role === 'admin'
    };
  }

  const statusMsg = getStatusMessage(ticket.status);
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-4">
        <Link
          href="/dashboard/client/tickets"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Help Centre
        </Link>
      </div>

      <div className="px-7 py-6 max-w-4xl mx-auto space-y-6">

        {/* Ticket Header */}
        <div>
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                {ticket.title}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[12px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
                <TicketTypeBadge type={ticket.type} size="sm" />
                <TicketPriorityBadge priority={ticket.priority} size="sm" />
              </div>
            </div>
          </div>

          {/* Status Banner */}
          <Card className={cn("rounded-xl p-4 flex items-center gap-3", statusMsg.bg, statusMsg.border)}>
            {statusMsg.icon === "emerald" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : statusMsg.icon === "violet" ? (
              <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <p className={cn("text-[13px] font-bold", statusMsg.color)}>{statusMsg.label}</p>
              <p className="text-[12px] text-slate-500">{statusMsg.description}</p>
            </div>
          </Card>
        </div>

        {/* Original Request */}
        <Card className="rounded-2xl border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Original Request</p>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>
            {ticket.projectName && (
              <div className="mt-4 pt-4 border-t border-slate-50">
                <span className="text-[12px] text-slate-400">Related project: </span>
                <span className="text-[12px] font-medium text-slate-700">{ticket.projectName}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Resolution Banner */}
        {ticket.resolution && (
          <Card className="rounded-2xl border-emerald-100 bg-emerald-50/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <p className="text-[13px] font-bold text-emerald-800">Issue Resolved</p>
              {ticket.resolvedAt && (
                <span className="text-[11px] text-emerald-600 ml-auto">
                  {formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}
                </span>
              )}
            </div>
            <div className="p-6">
              <p className="text-[13px] text-emerald-900 whitespace-pre-wrap leading-relaxed font-medium">{ticket.resolution}</p>
            </div>
          </Card>
        )}

        {/* Conversation */}
        {(comments.length > 0 || !isResolved) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                Conversation {comments.length > 0 && `(${comments.length})`}
              </h2>
            </div>

            {/* Reply Form — placed above conversation for easy access */}
            {!isResolved && (
              <Card className="rounded-2xl border-slate-100 overflow-hidden">
                <div className="p-4">
                  <TicketCommentForm ticketId={id} isAdmin={false} />
                </div>
              </Card>
            )}

            {/* Comment Bubbles */}
            <div className="space-y-3">
              {comments.map((comment) => {
                const author = getUserInfo(comment.authorId);
                const isStaff = author.isStaff;

                return (
                  <div key={comment.id} className={cn("flex gap-3", isStaff ? "flex-row" : "flex-row-reverse")}>
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-1">
                      {author.avatar ? (
                        <Image src={author.avatar} alt="" width={32} height={32} className="rounded-full border border-slate-100" />
                      ) : (
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold", isStaff ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500")}>
                          {author.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={cn("max-w-[75%] min-w-[200px]")}>
                      <div className={cn(
                        "rounded-2xl px-4 py-3",
                        isStaff
                          ? "bg-white border border-slate-100 rounded-tl-md"
                          : "bg-[#7C1CFF] text-white rounded-tr-md"
                      )}>
                        <p className={cn("text-[13px] whitespace-pre-wrap leading-relaxed", isStaff ? "text-slate-700" : "text-white")}>
                          {comment.content}
                        </p>
                      </div>
                      <div className={cn("flex items-center gap-2 mt-1 px-1", isStaff ? "justify-start" : "justify-end")}>
                        <span className="text-[11px] text-slate-400 font-medium">{author.name}</span>
                        {isStaff && (
                          <span className="text-[9px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-bold border border-violet-100">DD Team</span>
                        )}
                        <span className="text-[11px] text-slate-300">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
