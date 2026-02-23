"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Calendar, FileText, CheckCircle2, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncComponentStatus = "not_started" | "in_progress" | "built";
type SyncComponentKey = "employeeUpsertStatus" | "leaveSyncStatus" | "paySlipStatus";

interface BuildSyncComponentsProps {
  projectId: string;
  employeeUpsertStatus: SyncComponentStatus;
  leaveSyncStatus: SyncComponentStatus;
  paySlipStatus: SyncComponentStatus;
  isAdmin: boolean;
}

const COMPONENTS: {
  key: SyncComponentKey;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "employeeUpsertStatus",
    label: "Employee Upsert",
    description: "New hires, updates, terminations, bank accounts & superannuation",
    icon: Users,
  },
  {
    key: "leaveSyncStatus",
    label: "Leave Request Sync",
    description: "Leave types mapped, requests flowing HiBob → KeyPay",
    icon: Calendar,
  },
  {
    key: "paySlipStatus",
    label: "Pay Slip Upload",
    description: "Pay slips synced from KeyPay back into HiBob after each pay run",
    icon: FileText,
  },
];

const STATUS_CONFIG: Record<
  SyncComponentStatus,
  { label: string; icon: React.ElementType; className: string; dotClass: string }
> = {
  not_started: {
    label: "Not started",
    icon: Circle,
    className: "text-slate-400 bg-slate-50 border-slate-200",
    dotClass: "bg-slate-300",
  },
  in_progress: {
    label: "In progress",
    icon: Clock,
    className: "text-amber-600 bg-amber-50 border-amber-200",
    dotClass: "bg-amber-400",
  },
  built: {
    label: "Built",
    icon: CheckCircle2,
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
};

const STATUS_CYCLE: SyncComponentStatus[] = ["not_started", "in_progress", "built"];

export function BuildSyncComponents({
  projectId,
  employeeUpsertStatus,
  leaveSyncStatus,
  paySlipStatus,
  isAdmin,
}: BuildSyncComponentsProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<SyncComponentKey, SyncComponentStatus>>({
    employeeUpsertStatus,
    leaveSyncStatus,
    paySlipStatus,
  });
  const [updating, setUpdating] = useState<SyncComponentKey | null>(null);

  const cycleStatus = async (key: SyncComponentKey) => {
    if (!isAdmin || updating) return;
    const current = statuses[key];
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];

    setUpdating(key);
    setStatuses((prev) => ({ ...prev, [key]: next }));

    try {
      const res = await fetch(`/api/projects/${projectId}/build-components`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ component: key, status: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.refresh();
    } catch {
      setStatuses((prev) => ({ ...prev, [key]: current }));
      toast.error("Failed to update component status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-3">
      {COMPONENTS.map(({ key, label, description, icon: Icon }) => {
        const status = statuses[key];
        const config = STATUS_CONFIG[status];
        const StatusIcon = config.icon;
        const isUpdating = updating === key;

        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-4 bg-white rounded-2xl border p-4 transition-all",
              status === "built"
                ? "border-emerald-100 bg-emerald-50/30"
                : status === "in_progress"
                ? "border-amber-100 bg-amber-50/20"
                : "border-slate-100",
              isAdmin && "cursor-pointer hover:border-slate-300",
              isUpdating && "opacity-60"
            )}
            onClick={() => isAdmin && cycleStatus(key)}
            title={isAdmin ? "Click to advance status" : undefined}
          >
            {/* Icon */}
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                status === "built"
                  ? "bg-emerald-100"
                  : status === "in_progress"
                  ? "bg-amber-100"
                  : "bg-slate-100"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  status === "built"
                    ? "text-emerald-600"
                    : status === "in_progress"
                    ? "text-amber-600"
                    : "text-slate-400"
                )}
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold",
                  status === "built" ? "text-emerald-800" : "text-slate-800"
                )}
              >
                {label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>

            {/* Status badge */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0",
                config.className
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </div>
          </div>
        );
      })}

      {isAdmin && (
        <p className="text-xs text-slate-400 text-center pt-1">
          Click any component to advance its status
        </p>
      )}
    </div>
  );
}
