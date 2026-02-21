import { requireAdmin } from "@/lib/auth";
import { User, FileQuestion } from "lucide-react";
import { DiscoveryTemplateList } from "@/components/discovery-template-list";
import { AdminProfileForm } from "@/components/admin-profile-form";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-8 space-y-8 no-scrollbar font-geist">
      {/* Header */}
      <div className="animate-enter delay-100">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and portal configuration</p>
      </div>

      <div className="space-y-8 pb-8">
        {/* Profile Card */}
        <div className="animate-enter delay-200">
          <div className="flex items-center gap-2 mb-4 px-1">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">My Profile</span>
          </div>
          <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden max-w-lg">
            <AdminProfileForm />
          </Card>
        </div>

        {/* Discovery Templates */}
        <div className="animate-enter delay-300">
          <div className="flex items-center gap-2 mb-4 px-1">
            <FileQuestion className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discovery Templates</span>
          </div>
          <DiscoveryTemplateList />
        </div>
      </div>
    </div>
  );
}
