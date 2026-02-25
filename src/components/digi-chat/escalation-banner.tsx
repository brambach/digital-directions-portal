"use client";

import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

const SUPPORT_EMAIL = "support@digitaldirections-help.freshdesk.com";

interface EscalationBannerProps {
  onDismiss: () => void;
}

export function EscalationBanner({ onDismiss }: EscalationBannerProps) {
  return (
    <div className="mx-4 mb-2 p-3 bg-violet-50 border border-violet-200 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-[13px] text-slate-700 mb-2">
        Need more help? Email the team and they&apos;ll get back to you within 4 business hours.
      </p>
      <div className="flex gap-2">
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <Button size="sm" className="text-xs rounded-lg">
            <Mail className="w-3.5 h-3.5 mr-1" />
            Email Support
          </Button>
        </a>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-xs"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
