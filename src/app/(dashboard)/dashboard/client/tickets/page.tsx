import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, users, clients } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import dynamicImport from "next/dynamic";
import { MessageSquare, ShieldAlert, CheckCircle, Zap, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
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

export default async function ClientTicketsPage() {
  const user = await requireAuth();

  // Fetch all tickets for this client
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
    .where(and(eq(tickets.clientId, user.clientId!), isNull(tickets.deletedAt)))
    .orderBy(desc(tickets.createdAt));

  // Projects for create dialog
  const clientProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.clientId, user.clientId!), isNull(projects.deletedAt)));

  // Mock 'client' object for the dialog prop
  const clientObj = await db.query.clients.findFirst({
    where: eq(clients.id, user.clientId!)
  });

  // Wrap in array for the dialog which expects list
  const clientList = clientObj ? [{ id: clientObj.id, companyName: clientObj.companyName }] : [];

  const urgentTickets = ticketList.filter((t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed");
  const openTickets = ticketList.filter((t) => t.status === "open" || t.status === "in_progress");
  const resolvedTickets = ticketList.filter((t) => t.status === "resolved" || t.status === "closed");

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
      <AnimateOnScroll />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Help Center</h1>
          <p className="text-sm text-gray-500 mt-1">Find answers to common questions or submit a support request.</p>
        </div>
        <div className="flex items-center gap-3">
          <CreateTicketDialog clients={clientList} projects={clientProjects} />
        </div>
      </div>

      {/* FAQ Section */}
      <div className="animate-enter delay-200">
        <div className="bg-[#F9FAFB] rounded-xl p-8 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {/* FAQ Item 1 */}
            <details className="group bg-white rounded-xl border border-[#E5E7EB] hover:border-gray-300 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none p-5">
                <span className="text-sm font-medium text-gray-900">
                  How do I track my project progress?
                </span>
                <svg className="w-6 h-6 text-gray-400 group-open:text-purple-700 group-open:rotate-180 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Visit the Projects page from the sidebar to see all your active projects. Each project has a detailed page showing the roadmap progress, current phase, and system health. You&apos;ll receive automatic updates as your project moves through each phase.
                </p>
              </div>
            </details>

            {/* FAQ Item 2 */}
            <details className="group bg-white rounded-xl border border-[#E5E7EB] hover:border-gray-300 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none p-5">
                <span className="text-sm font-medium text-gray-900">
                  How do I access project files and documents?
                </span>
                <svg className="w-6 h-6 text-gray-400 group-open:text-purple-700 group-open:rotate-180 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  All project files are available on your project detail page. Click on any project, then scroll to the Files section. You can download files directly or view them in your browser. Files are organized by upload date with the most recent at the top.
                </p>
              </div>
            </details>

            {/* FAQ Item 3 */}
            <details className="group bg-white rounded-xl border border-[#E5E7EB] hover:border-gray-300 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none p-5">
                <span className="text-sm font-medium text-gray-900">
                  What&apos;s the best way to communicate with my team?
                </span>
                <svg className="w-6 h-6 text-gray-400 group-open:text-purple-700 group-open:rotate-180 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Use the Project Chat feature on each project page for quick questions and updates. For more complex issues or formal requests, submit a support ticket here in the Help Center. All communication is tracked and visible in your portal history.
                </p>
              </div>
            </details>

            {/* FAQ Item 4 */}
            <details className="group bg-white rounded-xl border border-[#E5E7EB] hover:border-gray-300 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none p-5">
                <span className="text-sm font-medium text-gray-900">
                  How long does it take to get a response to my ticket?
                </span>
                <svg className="w-6 h-6 text-gray-400 group-open:text-purple-700 group-open:rotate-180 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Most support tickets receive an initial response within 4 business hours. Urgent issues are prioritized and typically addressed within 1-2 hours. You&apos;ll receive email notifications when your ticket status changes or when our team adds a comment.
                </p>
              </div>
            </details>

            {/* FAQ Item 5 */}
            <details className="group bg-white rounded-xl border border-[#E5E7EB] hover:border-gray-300 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none p-5">
                <span className="text-sm font-medium text-gray-900">
                  Can I invite additional team members to the portal?
                </span>
                <svg className="w-6 h-6 text-gray-400 group-open:text-purple-700 group-open:rotate-180 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Yes! Contact your Digital Directions consultant or submit a support ticket with the email addresses of team members you&apos;d like to invite. They&apos;ll receive an invitation email with instructions to create their account and access your projects.
                </p>
              </div>
            </details>

            {/* FAQ Item 6 */}
            <details className="group bg-white rounded-xl border border-[#E5E7EB] hover:border-gray-300 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none p-5">
                <span className="text-sm font-medium text-gray-900">
                  What should I do if I notice an integration issue?
                </span>
                <svg className="w-6 h-6 text-gray-400 group-open:text-purple-700 group-open:rotate-180 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Integration health is monitored automatically every 5 minutes. If you notice an issue before we do, please submit an urgent support ticket with details about what you&apos;re experiencing. Include any error messages or screenshots to help us resolve it quickly.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Section Divider */}
      <div className="flex items-center gap-4 animate-enter delay-250">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Need More Help?</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter delay-300">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-purple-100 transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Open Tickets</p>
            <p className="text-2xl font-bold text-gray-900">{openTickets.length}</p>
          </div>
          <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-700 group-hover:bg-purple-100 transition-colors">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-100 transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Critical Issues</p>
            <p className="text-2xl font-bold text-gray-900">{urgentTickets.length}</p>
          </div>
          <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-emerald-100 transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resolved</p>
            <p className="text-2xl font-bold text-gray-900">{resolvedTickets.length}</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-100 transition-colors">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Active Requests Section */}
      <div className="animate-enter delay-400 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Zap className="w-4 h-4 text-purple-700" />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Active Queue</h2>
        </div>
        <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden bg-white">
          {openTickets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">All Caught Up!</p>
              <p className="text-xs text-gray-400 mt-1">You have no pending requests.</p>
              <div className="mt-4">
                <CreateTicketDialog clients={clientList} projects={clientProjects} />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-purple-50/30 text-left">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-8">Subject</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project & Priority</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-8 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {openTickets.map((ticket) => (
                    <tr key={ticket.id} className="group hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 pl-8">
                        <Link href={`/dashboard/client/tickets/${ticket.id}`} className="block">
                          <div className="flex items-start gap-4">
                            <div className="pt-1.5 flex flex-col items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-700 animate-pulse" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors flex items-center gap-2">
                                {ticket.title}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[300px]">{ticket.description}</p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gray-300 bg-gray-50 px-1 rounded">#{ticket.id.slice(-4)}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold text-gray-700">{ticket.projectName || "General Inquiry"}</span>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide w-fit border", getPriorityColor(ticket.priority))}>
                            {ticket.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <TicketStatusBadge status={ticket.status} />
                      </td>
                      <td className="px-6 py-4 pr-8 text-right">
                        <span className="text-xs text-gray-900 font-bold">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* History Section */}
      {resolvedTickets.length > 0 && (
        <div className="animate-enter delay-500 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Resolved History</h2>
          </div>
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden bg-gray-50/30">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 text-left">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest pl-8">Subject</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Project</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest pr-8 text-right">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resolvedTickets.map((ticket) => (
                    <tr key={ticket.id} className="group hover:bg-white transition-colors">
                      <td className="px-6 py-4 pl-8">
                        <Link href={`/dashboard/client/tickets/${ticket.id}`} className="block">
                          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                            <p className="font-bold text-gray-700 text-sm group-hover:text-purple-700 transition-colors">
                              {ticket.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 max-w-[300px] truncate">#{ticket.id.slice(-4)}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-500 opacity-60 group-hover:opacity-100">{ticket.projectName || "General"}</span>
                      </td>
                      <td className="px-6 py-4 opacity-70 group-hover:opacity-100">
                        <TicketStatusBadge status={ticket.status} size="sm" />
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
      )
      }
    </div>
  );
}
