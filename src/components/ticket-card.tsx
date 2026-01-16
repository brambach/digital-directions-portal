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
      <div className="card-elevated p-4 group hover:border-violet-200 transition-all duration-200">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-violet-700 transition-colors">
              {ticket.title}
            </h3>
            {showClient && ticket.clientName && (
              <p className="text-xs text-slate-400 mt-0.5">
                {ticket.clientName}
                {ticket.projectName && ` • ${ticket.projectName}`}
              </p>
            )}
          </div>
          <TicketPriorityBadge priority={ticket.priority} />
        </div>

        <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {ticket.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketTypeBadge type={ticket.type} />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
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

interface TicketListProps {
  tickets: TicketCardProps["ticket"][];
  basePath: string;
  showClient?: boolean;
  emptyMessage?: string;
}

export function TicketList({ tickets, basePath, showClient = true, emptyMessage = "No tickets found" }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="card-elevated">
        <div className="empty-state py-8">
          <MessageSquare className="empty-state-icon" />
          <p className="text-slate-500 text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket, index) => (
        <div
          key={ticket.id}
          className="animate-fade-in-up opacity-0"
          style={{ animationDelay: `${0.05 + index * 0.03}s` }}
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
