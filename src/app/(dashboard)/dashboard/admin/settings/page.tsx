import { requireAdmin } from "@/lib/auth";
import { User, FileQuestion } from "lucide-react";
import { DiscoveryTemplateList } from "@/components/discovery-template-list";
import { AdminProfileForm } from "@/components/admin-profile-form";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] no-scrollbar">
      {/* Page Header — Pattern A */}
      <div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">System</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
      </div>

      <div className="p-8 space-y-8 pb-8">
        {/* Profile Card */}
        <FadeIn>
          <div className="flex items-center gap-2 mb-4 px-1">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">My Profile</span>
          </div>
          <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden max-w-lg">
            <AdminProfileForm />
          </Card>
        </FadeIn>

        {/* Discovery Templates */}
        <FadeIn delay={0.1}>
          <div className="flex items-center gap-2 mb-4 px-1">
            <FileQuestion className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Discovery Templates</span>
          </div>
          <DiscoveryTemplateList />
        </FadeIn>
      </div>
    </div>
  );
}
