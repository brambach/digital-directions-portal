"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  Circle,
  Rocket,
  ClipboardCheck,
  Shield,
  Users,
  Clock,
  Activity,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface AdminGoLiveContentProps {
  projectId: string;
  projectName: string;
  checklist: SerializedChecklist | null;
  goLiveEvent: SerializedGoLiveEvent | null;
  currentUserId: string;
  goLiveDate: string | null;
}

export function AdminGoLiveContent({
  projectId,
  projectName,
  checklist,
  goLiveEvent,
  currentUserId,
  goLiveDate,
}: AdminGoLiveContentProps) {
  const router = useRouter();
  const [initializing, setInitializing] = useState(false);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
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

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/go-live`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initialize checklist");
      }
      toast.success("Go-live checklist initialized — client has been notified");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setInitializing(false);
    }
  };

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

  const handleTriggerGoLive = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/go-live/trigger`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to trigger go-live");
      }
      toast.success("Go-live triggered!");
      setTriggerDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setTriggering(false);
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

  // No checklist yet — show initialize button
  if (!checklist) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center space-y-4">
        <div className="py-4">
          <ClipboardCheck className="w-10 h-10 text-[#7C1CFF] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-slate-700 mb-1">
            Go-Live Checklist Not Yet Initialized
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Initialize the pre-go-live checklist to start preparing for production.
            The client will be notified to complete their items.
          </p>
        </div>
        <Button
          onClick={handleInitialize}
          disabled={initializing}
          className="rounded-full"
        >
          {initializing ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ClipboardCheck className="w-4 h-4 mr-2" />
          )}
          Initialize Go-Live Checklist
        </Button>
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
          {bothComplete && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-3 h-3" />
              Ready for Go-Live
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
            label="Client"
            completed={clientItems.filter((i) => i.completedAt).length}
            total={clientItems.length}
            isComplete={clientComplete}
          />
        </div>
      </div>

      {/* Admin checklist */}
      <ChecklistSection
        title="DD Team Checklist"
        description="Complete these items before triggering go-live."
        items={adminItems}
        canToggle={true}
        togglingItem={togglingItem}
        onToggle={handleToggleItem}
      />

      {/* Client checklist (read-only for admin) */}
      <ChecklistSection
        title="Client Checklist"
        description="Waiting for the client to complete these items."
        items={clientItems}
        canToggle={false}
        togglingItem={null}
        onToggle={() => {}}
      />

      {/* Go Live button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setTriggerDialogOpen(true)}
          disabled={!bothComplete}
          className="rounded-full"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Go Live
        </Button>
      </div>

      {/* Trigger confirmation dialog */}
      <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[#7C1CFF]" />
              Confirm Go-Live
            </DialogTitle>
            <DialogDescription>
              This will switch the integration to production. This action cannot be
              undone. Make sure all checklist items are verified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-800">
                Before proceeding, confirm:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  All admin checklist items verified
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  All client checklist items verified
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  Production recipes are ready
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTriggerDialogOpen(false)}
              disabled={triggering}
            >
              Cancel
            </Button>
            <Button onClick={handleTriggerGoLive} disabled={triggering}>
              {triggering ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              Confirm Go-Live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            Integration is Live!
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {goLiveDate
              ? `Went live on ${format(new Date(goLiveDate), "d MMMM yyyy 'at' h:mm a")}`
              : "Production integration is active"}
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
                The Digital Directions team is actively monitoring the integration.
                Any issues will be flagged and addressed immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
            Post Go-Live Steps
          </p>
          <div className="space-y-2 text-sm text-slate-600">
            <PostGoLiveStep
              num={1}
              text="Client performs basic live tests (update employee data, verify sync)"
            />
            <PostGoLiveStep
              num={2}
              text="Validate payslip export job performs as expected"
            />
            <PostGoLiveStep
              num={3}
              text="Create new KeyPay admin account using workato@ email address"
            />
            <PostGoLiveStep
              num={4}
              text="Establish production connections with new admin token"
            />
            <PostGoLiveStep
              num={5}
              text="Sign-off on integration build complete"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <Link
            href={`/dashboard/admin/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C1CFF] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View Integration Health Monitoring
          </Link>
        </div>
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
