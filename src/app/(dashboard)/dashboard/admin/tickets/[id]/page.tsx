import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users, ticketComments } from "@/lib/db/schema";
import { eq, and, isNull, desc, or, count } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, CheckCircle, Clock, User, ExternalLink, MessageSquare, Building2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeBadge } from "@/components/ticket-status-badge";
import { TicketActions } from "@/components/ticket-actions";
import { TicketCommentForm } from "@/components/ticket-comment-form";
import Image from "next/image";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireAdmin();
  const { id } = await params;

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
      assignedAt: tickets.assignedAt,
      resolvedAt: tickets.resolvedAt,
      resolvedBy: tickets.resolvedBy,
      resolution: tickets.resolution,
      createdAt: tickets.createdAt,
      clientName: clients.companyName,
      contactEmail: clients.contactEmail,
      projectName: projects.name,
      freshdeskId: tickets.freshdeskId,
      freshdeskUrl: tickets.freshdeskUrl,
    })
    .from(tickets)
    .leftJoin(clients, eq(tickets.clientId, clients.id))
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!ticket) {
    notFound();
  }

  // Fetch comments
  const comments = await db
    .select({
      id: ticketComments.id,
      content: ticketComments.content,
      isInternal: ticketComments.isInternal,
      authorId: ticketComments.authorId,
      createdAt: ticketComments.createdAt,
    })
    .from(ticketComments)
    .where(and(eq(ticketComments.ticketId, id), isNull(ticketComments.deletedAt)))
    .orderBy(desc(ticketComments.createdAt));

  // Get comment count for sidebar
  const commentCount = comments.length;

  // Get all user IDs we need to fetch
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

  const dbUserMap = new Map(dbUsers.map((u) => [u.id, { clerkId: u.clerkId, role: u.role }]));

  const clerk = await clerkClient();
  const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
  const clerkUsers = clerkIds.length > 0
    ? await Promise.all(clerkIds.map(async (cid) => {
      try {
        return await clerk.users.getUser(cid);
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

  const getUserInfo = (userId: string | null) => {
    if (!userId) return null;
    const dbUser = dbUserMap.get(userId);
    if (!dbUser) return { name: "User", avatar: null, role: null, email: null };
    const clerkUser = dbUser.clerkId ? clerkUserMap.get(dbUser.clerkId) : null;
    return {
      name: clerkUser
        ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User"
        : "User",
      avatar: clerkUser?.imageUrl || null,
      email: clerkUser?.emailAddresses[0]?.emailAddress || null,
      role: dbUser.role,
    };
  };

  const creator = getUserInfo(ticket.createdBy);
  const assignee = getUserInfo(ticket.assignedTo);
  const resolver = getUserInfo(ticket.resolvedBy);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] no-scrollbar">
      <AnimateOnScroll />

      {/* Page Header — Pattern A with back nav */}
      <div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
        <Link
          href="/dashboard/admin/tickets"
          className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Queue
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{ticket.title}</h1>
          {/* Action Bar */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <TicketActions
              ticketId={ticket.id}
              currentStatus={ticket.status}
              isAssigned={!!ticket.assignedTo}
              assignedToUserId={ticket.assignedTo}
              currentUserId={currentUser.id}
            />
            {ticket.freshdeskUrl && (
              <>
                <div className="w-px h-6 bg-slate-100 mx-1" />
                <a href={ticket.freshdeskUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="rounded-lg text-[12px] font-semibold gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Freshdesk
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-12 gap-8">
          {/* Main Content Column */}
          <div className="col-span-12 lg:col-span-8 space-y-6 animate-enter delay-100">

            {/* Ticket Body Card */}
            <Card className="rounded-2xl border-slate-100 shadow-sm overflow-visible">
              <div className="p-8">
                {/* Title Row */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
                    {ticket.title}
                    <span className="text-base text-slate-400 font-medium ml-2">#{ticket.id.slice(0, 8)}</span>
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    {creator?.avatar ? (
                      <Image src={creator.avatar} alt="" width={24} height={24} className="rounded-full ring-2 ring-white" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-slate-900">{creator?.name}</span>
                    {creator?.email && <span className="text-sm text-slate-400">&lt;{creator.email}&gt;</span>}
                    <span className="text-sm text-slate-400 ml-auto flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(ticket.createdAt), "h:mm a (MMM d)")}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none text-slate-600 mb-6">
                  <p className="whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>

                {/* Reply Area */}
                <div className="bg-slate-50/50 rounded-xl p-1 border border-transparent focus-within:border-violet-100 focus-within:bg-white focus-within:shadow-md transition-all">
                  <TicketCommentForm ticketId={id} isAdmin />
                </div>
              </div>
            </Card>

            {/* Comments Feed */}
            <div className="space-y-5">
              {comments.map((comment, idx) => {
                const author = getUserInfo(comment.authorId);

                return (
                  <div key={comment.id} className="flex gap-4 animate-enter" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex-shrink-0 mt-1">
                      {author?.avatar ? (
                        <Image src={author.avatar} alt="" width={36} height={36} className="rounded-full border border-slate-100 shadow-sm" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center border border-violet-100 text-[#7C1CFF]">
                          <span className="font-bold text-xs">{author?.name?.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{author?.name}</span>
                          {comment.isInternal && (
                            <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold border border-amber-100 uppercase tracking-wide">Internal Note</span>
                          )}
                          {author?.role === "admin" && !comment.isInternal && (
                            <span className="text-[9px] bg-violet-50 text-[#7C1CFF] px-1.5 py-0.5 rounded-full font-bold border border-violet-100 uppercase tracking-wide">DD Team</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                      </div>
                      <Card className={cn("p-5 rounded-xl border-slate-100 shadow-sm relative", comment.isInternal ? "bg-amber-50/30 border-amber-100" : "bg-white")}>
                        {comment.isInternal && <div className="absolute left-0 top-4 bottom-4 w-1 bg-amber-300 rounded-r-full" />}
                        <div className="prose prose-sm max-w-none text-slate-700">
                          <p className="whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                );
              })}

              {/* Resolution Card */}
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
                        <span className="text-sm font-bold text-slate-900">Resolved</span>
                        {resolver && <span className="text-xs text-slate-400">by {resolver.name}</span>}
                      </div>
                      {ticket.resolvedAt && <span className="text-xs text-slate-400 font-medium">{formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}</span>}
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

          {/* Right Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-5 animate-enter delay-200">

            {/* Details Card */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pl-2 mb-2">Details</h3>
              <Card className="p-5 rounded-xl border-slate-100 shadow-sm bg-white">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 pb-3">
                    <span className="text-sm font-medium text-slate-500">Ticket ID</span>
                    <span className="text-sm font-mono font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">#{ticket.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 pb-3">
                    <span className="text-sm font-medium text-slate-500">Created</span>
                    <span className="text-sm font-bold text-slate-900 text-right">{format(new Date(ticket.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 pb-3">
                    <span className="text-sm font-medium text-slate-500">Conversation</span>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      {commentCount} {commentCount === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                  {ticket.freshdeskUrl && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm font-medium text-slate-500">Freshdesk</span>
                      <a
                        href={ticket.freshdeskUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-violet-700 hover:text-violet-800 transition-colors flex items-center gap-1"
                      >
                        #{ticket.freshdeskId || "View"}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Requester Info */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pl-2 mb-2">Requester</h3>
              <Card className="p-5 rounded-xl border-slate-100 shadow-sm bg-white">
                <div className="flex items-center gap-3 mb-4">
                  {creator?.avatar ? (
                    <Image src={creator.avatar} alt="" width={40} height={40} className="rounded-xl" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-900 text-sm truncate">{creator?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{creator?.email}</p>
                  </div>
                </div>
                {ticket.clientName && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 px-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ticket.clientName}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-50">
                  <Link href={`/dashboard/admin/clients/${ticket.clientId}`}>
                    <Button variant="outline" className="w-full rounded-xl border-slate-200 text-xs font-bold uppercase tracking-wide">View Client</Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* Properties */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pl-2 mb-2">Properties</h3>
              <Card className="p-5 rounded-xl border-slate-100 shadow-sm bg-white">
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Type</label>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <TicketTypeBadge type={ticket.type} size="sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <TicketStatusBadge status={ticket.status} size="sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Priority</label>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <TicketPriorityBadge priority={ticket.priority} size="sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Assigned To</label>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                      {assignee?.avatar ? (
                        <Image src={assignee.avatar} alt="" width={24} height={24} className="rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-500" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900">{assignee?.name || "Unassigned"}</span>
                    </div>
                  </div>
                  {ticket.projectName && (
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Project</label>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <Link href={`/dashboard/admin/projects/${ticket.projectId}`} className="text-sm font-medium text-violet-700 hover:text-violet-800 transition-colors">
                          {ticket.projectName}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
