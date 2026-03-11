import { requireAuth } from "@/lib/auth";
import { CHANGELOG, LATEST_CLIENT_ENTRY_DATE } from "@/lib/changelog";
import { ChangelogPageClient } from "@/components/changelog-page-client";

export const dynamic = "force-dynamic";

export default async function ClientChangelogPage() {
  await requireAuth();

  const clientEntries = CHANGELOG.filter((e) => e.audience === "all");

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] no-scrollbar">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Tools
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Changelog
          </h1>
        </div>
      </div>

      <div className="p-8">
        <ChangelogPageClient
          entries={clientEntries}
          latestDate={LATEST_CLIENT_ENTRY_DATE}
        />
      </div>
    </div>
  );
}
