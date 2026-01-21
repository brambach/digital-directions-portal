import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, ticketComments, projects, users } from "@/lib/db/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, CheckCircle, Clock, FileText, Download, User, MoreHorizontal, Send } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeBadge } from "@/components/ticket-status-badge";
import { TicketCommentForm } from "@/components/ticket-comment-form";
import Image from "next/image";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireAuth();
  const { id } = await params;

  // Fetch ticket and verify owner
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

  // Fetch comments (Exclude internal notes)
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
      isStaff: dbU.role === 'admin' || dbU.role === 'super_admin'
    };
  }

  const assignee = getUserInfo(ticket.assignedTo);
  const resolver = getUserInfo(ticket.resolvedBy);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <Link
          href="/dashboard/client/tickets"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Requests
        </Link>

        {/* Simple Client Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl border-gray-200 text-gray-700 font-semibold" disabled={ticket.status === 'resolved' || ticket.status === 'closed'}>
            Mark Resolved
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-6 animate-enter delay-200">
          {/* Ticket Body */}
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-visible bg-white">
            <div className="p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight mb-2">
                  {ticket.title} <span className="text-lg text-gray-400 font-medium ml-2">#{ticket.id.slice(0, 8)}</span>
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Submitted on {format(new Date(ticket.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>

              <div className="prose prose-sm max-w-none text-gray-600 mb-8 leading-relaxed">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* Mock Attachments */}
              <div className="flex gap-4 mb-8">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 min-w-[200px] cursor-not-allowed opacity-70">
                  <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm border border-gray-50">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">No Attachments</p>
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              <div className="bg-gray-50/50 rounded-xl p-1 border border-transparent focus-within:border-indigo-100 focus-within:bg-white focus-within:shadow-md transition-all">
                <TicketCommentForm ticketId={id} isAdmin={false} />
              </div>
            </div>
          </Card>

          {/* Conversation Feed */}
          <div className="space-y-6">
            {comments.map((comment, idx) => {
              const author = getUserInfo(comment.authorId);
              const isStaff = author.isStaff;

              return (
                <div key={comment.id} className="flex gap-4 animate-enter" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex-shrink-0 mt-1">
                    {author.avatar ? (
                      <Image src={author.avatar} alt="" width={36} height={36} className="rounded-full border border-gray-100 shadow-sm" />
                    ) : (
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center border text-xs font-bold", isStaff ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-gray-100 border-gray-200 text-gray-500")}>
                        {author.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{author.name}</span>
                        {isStaff && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold border border-indigo-100 uppercase tracking-wide">Support Team</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    </div>
                    <Card className={cn("p-5 rounded-xl border-gray-100 shadow-sm relative", isStaff ? "bg-indigo-50/10" : "bg-white")}>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}

            {ticket.resolution && (
              <div className="flex gap-4 animate-enter">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">Issue Resolved</span>
                      {resolver && <span className="text-xs text-gray-400">by {resolver.name}</span>}
                    </div>
                    {ticket.resolvedAt && <span className="text-xs text-gray-400 font-medium">{formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}</span>}
                  </div>
                  <Card className="p-5 rounded-xl border-emerald-100 bg-emerald-50/30 shadow-sm">
                    <div className="prose prose-sm max-w-none text-emerald-900">
                      <p className="whitespace-pre-wrap font-medium">{ticket.resolution}</p>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6 animate-enter delay-300">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">Request Details</h3>
            <Card className="p-5 rounded-xl border-gray-100 shadow-sm bg-white">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Status</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center justify-between">
                    <TicketStatusBadge status={ticket.status} size="sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Ticket Type</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center justify-between">
                    <TicketTypeBadge type={ticket.type} size="sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Priority</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center justify-between">
                    <TicketPriorityBadge priority={ticket.priority} size="sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Assigned Agent</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center gap-2">
                    {assignee.avatar ? (
                      <Image src={assignee.avatar} alt="" width={24} height={24} className="rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900">{assignee.name || "Pending Assignment"}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
