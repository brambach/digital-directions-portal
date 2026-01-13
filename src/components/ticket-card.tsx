import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, User } from "lucide-react";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeBadge } from "./ticket-status-badge";

interface TicketCardProps {
  ticket: {
    id: string;
    title: string;
    description: string;
    type: "general_support" | "project_issue" | "feature_request" | "bug_report";
    status: "open" | "in_progress" | "waiting_on_client" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    clientName: string | null;
    projectName: string | null;
    creatorName: string;
    assigneeName: string | null;
    createdAt: Date;
  };
  href: string;
  showClient?: boolean;
}

export function TicketCard({ ticket, href, showClient = true }: TicketCardProps) {
  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-lg p-4 border border-slate-100 hover:border-indigo-200 transition-all duration-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] group animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{ticket.title}</h3>
            {showClient && ticket.clientName && (
              <p className="text-xs text-slate-400 mt-0.5">
                {ticket.clientName}
                {ticket.projectName && ` • ${ticket.projectName}`}
              </p>
            )}
          </div>
          <TicketPriorityBadge priority={ticket.priority} />
        </div>

        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{ticket.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketTypeBadge type={ticket.type} />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {ticket.assigneeName ? (
              <div className="flex items-center gap-1">
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

interface TicketListProps {
  tickets: TicketCardProps["ticket"][];
  basePath: string;
  showClient?: boolean;
  emptyMessage?: string;
}

export function TicketList({ tickets, basePath, showClient = true, emptyMessage = "No tickets found" }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-slate-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          href={`${basePath}/${ticket.id}`}
          showClient={showClient}
        />
      ))}
    </div>
  );
}
