import { requireAuth } from "@/lib/auth";
import { Mail } from "lucide-react";
import { DigiFloat } from "@/components/motion/digi-float";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OpenDigiButton } from "@/components/open-digi-button";

export const dynamic = "force-dynamic";

const SUPPORT_EMAIL = "support@digitaldirections-help.freshdesk.com";

export default async function ClientTicketsPage() {
  await requireAuth();

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Help</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support</h1>
      </div>

      <div className="px-7 py-6 space-y-6 max-w-2xl">

        {/* Digi Hero CTA */}
        <Card className="rounded-2xl border-slate-100 overflow-hidden bg-gradient-to-br from-white via-white to-violet-50/40">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <DigiFloat variant="neutral" size="sm" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Need help? Ask Digi first</h2>
              <p className="text-[13px] text-slate-500 leading-relaxed max-w-md">
                Digi can answer most questions instantly — from project updates to integration help.
                If Digi can&apos;t resolve your issue, it&apos;ll connect you with the team.
              </p>
              <div className="mt-4">
                <OpenDigiButton />
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Support */}
        <Card className="rounded-2xl border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Support</p>
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-[14px] font-semibold text-slate-800 mb-1">Contact the Digital Directions team</p>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Send us an email and we&apos;ll get back to you within{" "}
                <span className="font-semibold text-slate-700">4 business hours</span>.
              </p>
              <p className="mt-3 text-[12px] font-medium text-slate-400 font-mono">
                {SUPPORT_EMAIL}
              </p>
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex-shrink-0">
              <Button className="rounded-full font-semibold gap-2">
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
            </a>
          </div>
        </Card>

      </div>
    </div>
  );
}
