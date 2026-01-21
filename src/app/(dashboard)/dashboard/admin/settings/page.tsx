import { requireAdmin } from "@/lib/auth";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Settings as SettingsIcon, Workflow, Puzzle, Bell, Shield, User, Building, Save, Mail, Globe, Lock, Smartphone, Slack, Github, Database, LayoutTemplate, Palette } from "lucide-react";
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
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 space-y-8 no-scrollbar relative font-geist">
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
        <div className="col-span-12 lg:col-span-4 animate-enter delay-200">
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
        <div className="col-span-12 lg:col-span-8 animate-enter delay-200 stagger-1">
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

              {/* Brand Color Section */}
              <div className="col-span-1 md:col-span-2 pt-2">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Palette className="w-4 h-4 text-gray-900" />
                        <h4 className="text-sm font-bold text-gray-900">Brand Color</h4>
                      </div>
                      <p className="text-xs text-gray-500 max-w-md">
                        Choose a primary brand color. This will be used for buttons, active states, and highlights across the portal.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500 shadow-inner ring-1 ring-black/5" style={{ backgroundColor: '#6366F1' }}></div>
                      <div className="flex flex-col px-2">
                        <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hex Code</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-sm">#</span>
                          <Input
                            defaultValue="6366F1"
                            className="h-6 w-24 border-0 p-0 text-gray-900 font-mono font-medium focus-visible:ring-0 px-0 bg-transparent rounded-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-gray-200 mx-2"></div>

                    {/* Quick Select Circles */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 ring-2 ring-offset-2 ring-indigo-500 cursor-pointer shadow-sm hover:scale-105 transition-transform"></div>
                      <div className="w-8 h-8 rounded-full bg-gray-900 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-gray-900 transition-all hover:scale-105"></div>
                      <div className="w-8 h-8 rounded-full bg-emerald-500 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-emerald-500 transition-all hover:scale-105"></div>
                      <div className="w-8 h-8 rounded-full bg-cyan-500 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-cyan-500 transition-all hover:scale-105"></div>
                    </div>
                  </div>
                </div>
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

        {/* Integrations */}
        <div className="col-span-12 lg:col-span-4 animate-enter delay-400">
          <Card className="h-full border-gray-100 shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Puzzle className="w-3.5 h-3.5" />
              Connected Apps
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-200">
                    <Slack className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Slack</div>
                    <div className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      Connected
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-gray-900">
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-200">
                    <Github className="w-5 h-5 text-gray-900" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">GitHub</div>
                    <div className="text-[10px] font-medium text-gray-400">Not connected</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl font-semibold text-xs">Connect</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-200">
                    <Database className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Supabase</div>
                    <div className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      Connected
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-gray-900">
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Notifications */}
        <div className="col-span-12 lg:col-span-4 animate-enter delay-400 stagger-1">
          <Card className="h-full border-gray-100 shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Bell className="w-3.5 h-3.5" />
              Notifications
            </div>
            <div className="space-y-1">
              {["New project created", "Task status updated", "New client message", "System alerts"].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded-lg -mx-2 transition-colors">
                  <span className="text-sm font-medium text-gray-700">{item}</span>
                  <div className={cn("w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out", i === 3 ? "bg-gray-200" : "bg-gray-900")}>
                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out", i === 3 ? "translate-x-0" : "translate-x-4")}></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Security */}
        <div className="col-span-12 lg:col-span-4 animate-enter delay-400 stagger-2">
          <Card className="h-full border-gray-100 shadow-sm rounded-xl p-6 bg-gradient-to-br from-white to-gray-50">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Shield className="w-3.5 h-3.5" />
              Security
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
                <Lock className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-gray-900 font-bold mb-1">Two-Factor Auth</h3>
              <p className="text-xs text-gray-500 mb-6 max-w-[200px] mx-auto">Secure your account with 2FA protection via authenticator app.</p>
              <Button variant="outline" size="sm" className="rounded-xl font-semibold">
                Enable 2FA
              </Button>
            </div>
            <div className="border-t border-gray-100 pt-4 mt-2">
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Active Sessions</span>
                </div>
                <span className="text-xs font-bold text-gray-900">2 Devices</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
