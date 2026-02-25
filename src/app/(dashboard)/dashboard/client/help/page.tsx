import { requireAuth } from "@/lib/auth";
import { HelpClientBrowser } from "@/components/help-client-browser";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientHelpPage() {
  await requireAuth();

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Resources
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Help Centre
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <BookOpen className="w-4 h-4" />
            Knowledge base & guides
          </div>
        </div>
      </div>

      <div className="px-7 py-6">
        <HelpClientBrowser />
      </div>
    </div>
  );
}
