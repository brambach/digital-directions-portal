import { requireAdmin } from "@/lib/auth";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Shield, User, Building, Save, Mail, Globe, Smartphone, LayoutTemplate } from "lucide-react";
import { PhaseTemplateList } from "@/components/phase-template-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const user = await currentUser();

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F5F9] p-8 space-y-8 no-scrollbar relative font-geist">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-enter delay-100">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and workspace preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-xl font-semibold text-gray-600">
            Cancel
          </Button>
          <Button size="sm" className="rounded-xl font-semibold">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 pb-8">

        {/* Profile Card */}
        <div className="col-span-12 lg:col-span-6 animate-enter delay-200">
          <Card className="h-full border-gray-100 shadow-sm rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-6">
                <User className="w-3.5 h-3.5" />
                My Profile
              </div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xl font-bold border-4 border-white shadow-lg overflow-hidden">
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.firstName?.charAt(0) || "A"
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{user?.fullName || "Admin User"}</h2>
                  <p className="text-sm text-gray-500 font-medium">Administrator</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</Label>
                <Input defaultValue={user?.fullName || ""} className="bg-gray-50 border-gray-200 rounded-xl " />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input defaultValue={user?.emailAddresses[0]?.emailAddress || ""} className="pl-9 bg-gray-50 border-gray-200 rounded-xl " />
                </div>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full rounded-xl border-dashed border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-400">
                  Change Avatar
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Workspace/Company Card */}
        <div className="col-span-12 lg:col-span-6 animate-enter delay-200 stagger-1">
          <Card className="h-full border-gray-100 shadow-sm rounded-xl">
            <div className="p-6 border-b border-gray-50">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <Building className="w-3.5 h-3.5" />
                Workspace Settings
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace Name</Label>
                <Input defaultValue="Digital Directions Portal" className="bg-gray-50 border-gray-200 rounded-xl " />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Support Email</Label>
                <Input defaultValue="support@digitaldirections.com" className="bg-gray-50 border-gray-200 rounded-xl " />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Website URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input defaultValue="https://portal.digitaldirections.com" className="pl-9 bg-gray-50 border-gray-200 rounded-xl " />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timezone</Label>
                <Input defaultValue="(GMT-08:00) Pacific Time" className="bg-gray-50 border-gray-200 rounded-xl " />
              </div>

            </div>
          </Card>
        </div>

        {/* Phase Templates Section */}
        <div className="col-span-12 animate-enter delay-300">
          <div className="flex items-center gap-2 mb-4 px-1">
            <LayoutTemplate className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phase Templates</span>
          </div>
          <div className="bg-transparent">
            <PhaseTemplateList />
          </div>
        </div>

        {/* Security - Active Sessions Info */}
        <div className="col-span-12 lg:col-span-4 animate-enter delay-400">
          <Card className="h-full border-gray-100 shadow-sm rounded-xl p-6 bg-gradient-to-br from-white to-gray-50">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Shield className="w-3.5 h-3.5" />
              Security
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Active Sessions</span>
                </div>
                <span className="text-sm font-bold text-gray-900">2 Devices</span>
              </div>
              <p className="text-xs text-gray-500 px-2">
                Security settings are managed through your Clerk account. Click your profile to access additional security options.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
