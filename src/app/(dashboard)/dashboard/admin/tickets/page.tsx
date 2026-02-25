import { requireAdmin } from "@/lib/auth";
import { ExternalLink, Headphones } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

export const dynamic = "force-dynamic";

const FRESHDESK_URL = "https://digitaldirections-help.freshdesk.com";

export default async function AdminTicketsPage() {
  await requireAdmin();

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Support</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Queue</h1>
        </div>
      </div>

      <div className="px-7 py-12 flex items-start justify-center">
        <FadeIn>
          <Card className="rounded-2xl border-slate-100 shadow-sm p-10 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
              <Headphones className="w-7 h-7 text-violet-600" strokeWidth={1.75} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Support is managed via Freshdesk</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Client support tickets are handled through Freshdesk email ticketing. Open Freshdesk to view and respond to tickets.
            </p>
            <a href={FRESHDESK_URL} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-full font-semibold gap-2 w-full">
                <ExternalLink className="w-4 h-4" />
                Open Freshdesk
              </Button>
            </a>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
