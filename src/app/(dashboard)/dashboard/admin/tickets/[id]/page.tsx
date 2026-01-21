import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users, ticketComments } from "@/lib/db/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, CheckCircle, Clock, User, LayoutGrid, MoreHorizontal, UserPlus, Archive, Flag, Mail, Calendar, AlertCircle, FileText, Download } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeBadge } from "@/components/ticket-status-badge";
import { TicketActions } from "@/components/ticket-actions";
import { TicketCommentForm } from "@/components/ticket-comment-form";
import { TimeEntriesList } from "@/components/time-entries-list";
import Image from "next/image";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireAdmin();
  const { id } = await params;

  // Fetch ticket with related data
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

  // Get all user IDs we need to fetch
  const userIds = [
    ticket.createdBy,
    ticket.assignedTo,
    ticket.resolvedBy,
    ...comments.map((c) => c.authorId),
  ].filter(Boolean) as string[];

  const uniqueUserIds = [...new Set(userIds)];

  // Fetch DB users
  const dbUsers = uniqueUserIds.length > 0
    ? await db
      .select({ id: users.id, clerkId: users.clerkId, role: users.role })
      .from(users)
      .where(or(...uniqueUserIds.map((uid) => eq(users.id, uid))))
    : [];

  const dbUserMap = new Map(dbUsers.map((u) => [u.id, { clerkId: u.clerkId, role: u.role }]));

  // Fetch Clerk users
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
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Header / Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <Link
          href="/dashboard/admin/tickets"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Queue
        </Link>

        {/* Action Bar (Hostpay Style) */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          <TicketActions
            ticketId={ticket.id}
            currentStatus={ticket.status}
            isAssigned={!!ticket.assignedTo}
            assignedToUserId={ticket.assignedTo}
            currentUserId={currentUser.id}
          />
          <div className="w-px h-6 bg-gray-100 mx-1"></div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <Archive className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <Flag className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content Column */}
        <div className="col-span-12 lg:col-span-8 space-y-6 animate-enter delay-200">

          {/* Ticket Body Card */}
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-visible">
            <div className="p-8">
              {/* Title Row */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight mb-2">
                    {ticket.title} <span className="text-lg text-gray-400 font-medium ml-2">#{ticket.id.slice(0, 8)}</span>
                  </h1>
                  <div className="flex items-center gap-3">
                    {creator?.avatar ? (
                      <Image src={creator.avatar} alt="" width={24} height={24} className="rounded-full ring-2 ring-white" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-gray-900">{creator?.name}</span>
                    <span className="text-sm text-gray-500">&lt;{creator?.email || "No email"}&gt;</span>
                    <span className="text-sm text-gray-400 ml-auto flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(ticket.createdAt), "h:mm a (MMM d)")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none text-gray-600 mb-8">
                <p className="whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </div>

              {/* Mock Attachments (Visual Only) */}
              <div className="flex gap-4 mb-8">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 min-w-[200px] hover:bg-gray-100 transition-colors cursor-pointer group">
                  <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm border border-gray-50 group-hover:border-gray-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">System_Logs.txt</p>
                    <p className="text-[10px] text-gray-400">12 KB</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Can add more if needed */}
              </div>

              {/* Reply Area */}
              <div className="bg-gray-50/50 rounded-xl p-1 border border-transparent focus-within:border-indigo-100 focus-within:bg-white focus-within:shadow-md transition-all">
                <TicketCommentForm ticketId={id} isAdmin />
              </div>
            </div>
          </Card>

          {/* Comments Feed */}
          <div className="space-y-6">
            {comments.map((comment, idx) => {
              const author = getUserInfo(comment.authorId);
              const isMe = author?.email === creator?.email; // Mock "Me" vs "Them" check

              return (
                <div key={comment.id} className="flex gap-4 animate-enter" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex-shrink-0 mt-1">
                    {author?.avatar ? (
                      <Image src={author.avatar} alt="" width={36} height={36} className="rounded-full border border-gray-100 shadow-sm" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-500">
                        <span className="font-bold text-xs">{author?.name?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{author?.name}</span>
                        {comment.isInternal && (
                          <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold border border-amber-100 uppercase tracking-wide">Internal Note</span>
                        )}
                        <span className="text-xs text-gray-400">{author?.email}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    </div>

                    <Card className={cn("p-6 rounded-xl border-gray-100 shadow-sm relative", comment.isInternal ? "bg-amber-50/30" : "bg-white")}>
                      {comment.isInternal && <div className="absolute left-0 top-4 bottom-4 w-1 bg-amber-300 rounded-r-full"></div>}
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}

            {/* Resolution Card if resolved */}
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
                      <span className="text-sm font-bold text-gray-900">Valid Solution</span>
                      {resolver && <span className="text-xs text-gray-400">by {resolver.name}</span>}
                    </div>
                    {ticket.resolvedAt && <span className="text-xs text-gray-400 font-medium">{formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}</span>}
                  </div>
                  <Card className="p-6 rounded-xl border-emerald-100 bg-emerald-50/30 shadow-sm">
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
        <div className="col-span-12 lg:col-span-4 space-y-6 animate-enter delay-300">

          {/* Details Card */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">Details</h3>
            <Card className="p-5 rounded-xl border-gray-100 shadow-sm bg-white">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-1 border-b border-gray-50 pb-3">
                  <span className="text-sm font-medium text-gray-500">Ticket ID</span>
                  <span className="text-sm font-mono font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded">#{ticket.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50 pb-3">
                  <span className="text-sm font-medium text-gray-500">Created</span>
                  <span className="text-sm font-bold text-gray-900 text-right">{format(new Date(ticket.createdAt), "MMM d, h:mm a")}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium text-gray-500">Resolution Due</span>
                  <span className="text-sm font-bold text-indigo-600 text-right">Draft</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Requester Info */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">Requester Info</h3>
            <Card className="p-5 rounded-xl border-gray-100 shadow-sm bg-white">
              <div className="flex items-center gap-4 mb-4">
                {creator?.avatar ? (
                  <Image src={creator.avatar} alt="" width={48} height={48} className="rounded-xl" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-gray-900 truncate">{creator?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{creator?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Previous Tickets: 12</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Verified Customer</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50">
                <Link href={`/dashboard/admin/clients/${ticket.clientId}`}>
                  <Button variant="outline" className="w-full rounded-xl border-gray-200 text-xs font-bold uppercase tracking-wide">View Profile</Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Properties */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">Properties</h3>
            <Card className="p-5 rounded-xl border-gray-100 shadow-sm bg-white">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Type</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center justify-between">
                    <TicketTypeBadge type={ticket.type} size="sm" />
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Status</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center justify-between">
                    <TicketStatusBadge status={ticket.status} size="sm" />
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Priority</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center justify-between">
                    <TicketPriorityBadge priority={ticket.priority} size="sm" />
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Assign To</label>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center gap-2">
                    {assignee?.avatar ? (
                      <Image src={assignee.avatar} alt="" width={24} height={24} className="rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900">{assignee?.name || "Unassigned"}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Time Logged Widget */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">Time Logged</h3>
            <Card className="p-5 rounded-xl border-gray-100 shadow-sm bg-white">
              <TimeEntriesList ticketId={id} />
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
