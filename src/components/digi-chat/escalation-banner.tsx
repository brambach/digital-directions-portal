"use client";

import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

interface EscalationBannerProps {
  onOpenTicket: () => void;
  onDismiss: () => void;
}

export function EscalationBanner({
  onOpenTicket,
  onDismiss,
}: EscalationBannerProps) {
  return (
    <div className="mx-4 mb-2 p-3 bg-violet-50 border border-violet-200 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-[13px] text-slate-700 mb-2">
        Would you like to open a support ticket? A team member will follow up.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onOpenTicket} className="text-xs rounded-lg">
          <Ticket className="w-3.5 h-3.5 mr-1" />
          Open Ticket
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-xs"
        >
          No thanks
        </Button>
      </div>
    </div>
  );
}
