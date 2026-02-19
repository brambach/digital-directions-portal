import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, User, Clock, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketCardProps {
  ticket: {
    id: string;
    title: string;
    description: string;
    type: "general_support" | "project_issue" | "feature_request" | "bug_report";
    status: "open" | "in_progress" | "waiting_on_client" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    clientName?: string | null;
    projectName?: string | null;
    creatorName: string;
    assigneeName?: string | null;
    createdAt: Date;
  };
  href: string;
  showClient?: boolean;
  urgent?: boolean;
}

export function StatusPill({ status }: { status: string }) {
  const variants: any = {
    open: 'bg-amber-50 text-amber-600 border-amber-100',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-100',
    waiting_on_client: 'bg-amber-50 text-amber-600 border-amber-100',
    resolved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    closed: 'bg-slate-50 text-slate-500 border-slate-100',
  };
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap",
      variants[status] || variants.closed
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function TicketCard({ ticket, href, showClient = true, urgent = false }: TicketCardProps) {
  const isUrgent = ticket.priority === 'urgent' || urgent;

  return (
    <Link href={href} className="block group">
      <div className={cn(
        "bg-white border rounded-xl p-6 shadow-sm hover-card transition-all font-geist",
        isUrgent ? "border-red-100 bg-red-50/10" : "border-slate-100 shadow-sm"
      )}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
              isUrgent ? "bg-red-100 text-red-600" : "bg-purple-50 text-purple-700"
            )}>
              {isUrgent ? <ShieldAlert className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors leading-tight">{ticket.title}</h3>
              <div className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tight">
                {showClient && ticket.clientName ? `${ticket.clientName} • ` : ''}
                {ticket.projectName || 'General Support'}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusPill status={ticket.status} />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-6">{ticket.description}</p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50 font-geist">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-400">
              <User className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">{ticket.creatorName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-300" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">SLA Active</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tight hidden sm:inline">Assignee:</span>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <div className="w-4 h-4 rounded-full bg-purple-700 flex items-center justify-center text-[8px] font-bold text-white uppercase">
                {ticket.assigneeName?.substring(0, 2) || '??'}
              </div>
              <span className="text-[9px] font-bold text-gray-700 uppercase tracking-tight">
                {ticket.assigneeName || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface TicketListProps {
  tickets: TicketCardProps["ticket"][];
  basePath: string;
  showClient?: boolean;
  emptyMessage?: string;
}

export function TicketList({ tickets, basePath, showClient = true, emptyMessage = "No tickets found" }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="py-12 text-center bg-gray-50/30 border border-dashed border-gray-200 rounded-[28px]">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {tickets.map((ticket, index) => (
        <div
          key={ticket.id}
          className="animate-enter"
          style={{ animationDelay: `${0.1 + index * 0.05}s` }}
        >
          <TicketCard
            ticket={ticket}
            href={`${basePath}/${ticket.id}`}
            showClient={showClient}
          />
        </div>
      ))}
    </div>
  );
}
