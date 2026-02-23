"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  Circle,
  Shield,
  Users,
  Clock,
  Activity,
  ExternalLink,
} from "lucide-react";
import { DigiMascot } from "@/components/digi-mascot";
import { CelebrationOverlay } from "@/components/celebration-overlay";
import { format } from "date-fns";
import Link from "next/link";

interface ChecklistItem {
  id: string;
  title: string;
  completedAt?: string;
  completedBy?: string;
}

interface SyncStatsData {
  employeesSynced?: number;
  recordsCreated?: number;
  recipesActive?: number;
  integrationName?: string;
}

interface SerializedChecklist {
  id: string;
  projectId: string;
  adminItems: string;
  clientItems: string;
  createdAt: string;
  updatedAt: string;
}

interface SerializedGoLiveEvent {
  id: string;
  projectId: string;
  celebratedAt: string;
  syncStats: string | null;
  celebrationShownTo: string | null;
}

interface ClientGoLiveContentProps {
  projectId: string;
  projectName: string;
  checklist: SerializedChecklist | null;
  goLiveEvent: SerializedGoLiveEvent | null;
  currentUserId: string;
  goLiveDate: string | null;
}

export function ClientGoLiveContent({
  projectId,
  projectName,
  checklist,
  goLiveEvent,
  currentUserId,
  goLiveDate,
}: ClientGoLiveContentProps) {
  const router = useRouter();
  const [togglingItem, setTogglingItem] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(() => {
    if (!goLiveEvent) return false;
    const shownTo: string[] = JSON.parse(goLiveEvent.celebrationShownTo || "[]");
    return !shownTo.includes(currentUserId);
  });

  const adminItems: ChecklistItem[] = checklist
    ? JSON.parse(checklist.adminItems)
    : [];
  const clientItems: ChecklistItem[] = checklist
    ? JSON.parse(checklist.clientItems)
    : [];

  const adminComplete = adminItems.length > 0 && adminItems.every((i) => i.completedAt);
  const clientComplete = clientItems.length > 0 && clientItems.every((i) => i.completedAt);
  const bothComplete = adminComplete && clientComplete;

  const syncStats: SyncStatsData | null = goLiveEvent?.syncStats
    ? JSON.parse(goLiveEvent.syncStats)
    : null;

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    setTogglingItem(itemId);
    try {
      const res = await fetch(`/api/projects/${projectId}/go-live`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, completed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update item");
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setTogglingItem(null);
    }
  };

  const handleDismissCelebration = async () => {
    setShowCelebration(false);
    try {
      await fetch(`/api/projects/${projectId}/go-live/celebration`, {
        method: "POST",
      });
    } catch {
      // Non-fatal
    }
  };

  // Celebration overlay
  if (showCelebration) {
    return (
      <CelebrationOverlay
        projectName={projectName}
        syncStats={syncStats}
        onDismiss={handleDismissCelebration}
      />
    );
  }

  // Post go-live state
  if (goLiveEvent) {
    return <PostGoLiveView projectId={projectId} goLiveDate={goLiveDate} syncStats={syncStats} />;
  }

  // No checklist yet — waiting for DD
  if (!checklist) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-5">
          <DigiMascot variant="sleeping" className="w-20 md:w-24 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-snug text-slate-800">
              Go-Live checklist not yet available
            </h3>
            <p className="text-sm mt-1 leading-relaxed text-slate-500">
              The Digital Directions team is preparing the pre-go-live checklist.
              You&apos;ll be notified when it&apos;s ready for you to complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active checklist view
  return (
    <>
      {/* Progress summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Pre-Go-Live Progress</h3>
          {bothComplete ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-3 h-3" />
              Ready for Go-Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-[#7C1CFF]">
              <Clock className="w-3 h-3" />
              In Progress
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ProgressCard
            icon={Shield}
            label="DD Team"
            completed={adminItems.filter((i) => i.completedAt).length}
            total={adminItems.length}
            isComplete={adminComplete}
          />
          <ProgressCard
            icon={Users}
            label="Your Items"
            completed={clientItems.filter((i) => i.completedAt).length}
            total={clientItems.length}
            isComplete={clientComplete}
          />
        </div>

        {bothComplete && (
          <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <DigiMascot variant="celebrating" size="xs" />
            <p className="text-xs text-emerald-700 font-medium">
              All items complete! The Digital Directions team will trigger go-live shortly.
            </p>
          </div>
        )}
      </div>

      {/* Client checklist (interactive) */}
      <ChecklistSection
        title="Your Checklist"
        description="Complete these items before go-live can be triggered."
        items={clientItems}
        canToggle={true}
        togglingItem={togglingItem}
        onToggle={handleToggleItem}
      />

      {/* Admin checklist (read-only for client) */}
      <ChecklistSection
        title="DD Team Checklist"
        description="The Digital Directions team is working through these items."
        items={adminItems}
        canToggle={false}
        togglingItem={null}
        onToggle={() => {}}
      />
    </>
  );
}

function ProgressCard({
  icon: Icon,
  label,
  completed,
  total,
  isComplete,
}: {
  icon: React.ElementType;
  label: string;
  completed: number;
  total: number;
  isComplete: boolean;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        {isComplete && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isComplete ? "bg-emerald-500" : "bg-[#7C1CFF]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400">
        {completed}/{total} complete
      </p>
    </div>
  );
}

function ChecklistSection({
  title,
  description,
  items,
  canToggle,
  togglingItem,
  onToggle,
}: {
  title: string;
  description: string;
  items: ChecklistItem[];
  canToggle: boolean;
  togglingItem: string | null;
  onToggle: (itemId: string, completed: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isComplete = !!item.completedAt;
          const isToggling = togglingItem === item.id;

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                isComplete
                  ? "border-emerald-100 bg-emerald-50/50"
                  : "border-slate-100"
              }`}
            >
              {canToggle ? (
                <button
                  type="button"
                  onClick={() => onToggle(item.id, !isComplete)}
                  disabled={isToggling}
                  className="mt-0.5 flex-shrink-0"
                >
                  {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : isComplete ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 hover:text-[#7C1CFF] transition-colors" />
                  )}
                </button>
              ) : (
                <div className="mt-0.5 flex-shrink-0">
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    isComplete
                      ? "text-slate-500 line-through"
                      : "text-slate-800 font-medium"
                  }`}
                >
                  {item.title}
                </p>
                {isComplete && item.completedAt && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Completed {format(new Date(item.completedAt), "d MMM yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostGoLiveView({
  projectId,
  goLiveDate,
  syncStats,
}: {
  projectId: string;
  goLiveDate: string | null;
  syncStats: SyncStatsData | null;
}) {
  return (
    <div className="space-y-5">
      {/* Success banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-4">
        <DigiMascot variant="celebrating" size="sm" />
        <div>
          <p className="text-sm font-bold text-emerald-800">
            Your Integration is Live!
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {goLiveDate
              ? `Went live on ${format(new Date(goLiveDate), "d MMMM yyyy")}`
              : "Your production integration is active"}
          </p>
        </div>
      </div>

      {/* Sync stats */}
      {syncStats && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Go-Live Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {syncStats.employeesSynced != null && (
              <MiniStat label="Employees Synced" value={String(syncStats.employeesSynced)} />
            )}
            {syncStats.recordsCreated != null && (
              <MiniStat label="Records Created" value={String(syncStats.recordsCreated)} />
            )}
            {syncStats.recipesActive != null && (
              <MiniStat label="Recipes Active" value={String(syncStats.recipesActive)} />
            )}
            {syncStats.integrationName && (
              <MiniStat label="Integration" value={String(syncStats.integrationName)} />
            )}
          </div>
        </div>
      )}

      {/* Monitoring period */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#7C1CFF]" />
          <h3 className="font-bold text-slate-900 text-sm">
            Post Go-Live Monitoring
          </h3>
        </div>
        <div className="bg-violet-50 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#7C1CFF] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-900">
                48–72 Hour Monitoring Period
              </p>
              <p className="text-xs text-violet-700 mt-0.5 leading-relaxed">
                The Digital Directions team is actively monitoring your integration.
                If you notice any issues, please raise a support ticket immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
            What to do now
          </p>
          <div className="space-y-2 text-sm text-slate-600">
            <PostGoLiveStep
              num={1}
              text="Log in to HiBob and perform basic updates to test the live sync"
            />
            <PostGoLiveStep
              num={2}
              text="Verify changes flow through to your payroll system"
            />
            <PostGoLiveStep
              num={3}
              text="Report any issues immediately via a support ticket"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center gap-4">
          <Link
            href={`/dashboard/client/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C1CFF] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View Integration Health
          </Link>
          <Link
            href="/dashboard/client/tickets"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C1CFF] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Support Tickets
          </Link>
        </div>
      </div>

      {/* Support package notice */}
      <div className="bg-violet-50 rounded-2xl border border-violet-100 px-5 py-4">
        <p className="text-sm font-semibold text-violet-900">
          Support Package Activated
        </p>
        <p className="text-xs text-violet-700 mt-1 leading-relaxed">
          Your ongoing support package is now active. Use the portal to raise tickets,
          track integration health, and communicate with the Digital Directions team.
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
        {label}
      </p>
    </div>
  );
}

function PostGoLiveStep({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-[#7C1CFF]">
        {num}
      </span>
      <span className="text-xs leading-relaxed">{text}</span>
    </div>
  );
}
