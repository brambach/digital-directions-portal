import { requireAdmin } from "@/lib/auth";
import { Settings as SettingsIcon, Workflow, Puzzle, Bell, Shield } from "lucide-react";
import { PhaseTemplateList } from "@/components/phase-template-list";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-10">
        {/* Page Header */}
        <header className="mb-10 animate-fade-in-up opacity-0 stagger-1">
          <div className="flex items-center gap-2 mb-3">
            <SettingsIcon className="w-4 h-4 text-violet-500" />
            <span className="text-label text-violet-600">Configuration</span>
          </div>
          <h1 className="text-display text-3xl sm:text-4xl text-slate-900 mb-2">
            Settings
          </h1>
          <p className="text-slate-500 max-w-lg">
            Manage global settings and configurations for the Digital Directions
            portal.
          </p>
        </header>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Phase Templates Section */}
          <section className="animate-fade-in-up opacity-0 stagger-2">
            <div className="section-divider mb-6">
              <Workflow className="w-4 h-4 text-violet-500" />
              <span>Phase Templates</span>
            </div>

            <div className="card-elevated p-6 mb-4">
              <p className="text-sm text-slate-600 mb-4">
                Phase templates define the default project phases that can be applied
                to new projects. Create reusable templates for different implementation types.
              </p>
            </div>

            <PhaseTemplateList />
          </section>

          {/* Future Settings Sections (Placeholder Cards) */}
          <section className="animate-fade-in-up opacity-0 stagger-3">
            <div className="section-divider mb-6">
              <Puzzle className="w-4 h-4 text-blue-500" />
              <span>Integrations</span>
            </div>

            <div className="card-elevated p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Puzzle className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-heading text-slate-900 mb-2">
                Integration Settings
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Configure API keys and webhooks for Slack, Resend, and other
                third-party integrations. Coming soon.
              </p>
            </div>
          </section>

          <section className="animate-fade-in-up opacity-0 stagger-4">
            <div className="section-divider mb-6">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Notifications</span>
            </div>

            <div className="card-elevated p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-heading text-slate-900 mb-2">
                Notification Preferences
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Configure email and Slack notification settings for tickets,
                messages, and system alerts. Coming soon.
              </p>
            </div>
          </section>

          <section className="animate-fade-in-up opacity-0 stagger-5">
            <div className="section-divider mb-6">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Security</span>
            </div>

            <div className="card-elevated p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-heading text-slate-900 mb-2">
                Security Settings
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Manage authentication policies, session settings, and audit
                logs. Coming soon.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
