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
  /** "grid" = tall portrait cards (client view), "list" = compact rows (admin view) */
  layout?: "grid" | "list";
}

const SYNC_COMPONENTS: {
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
  {
    label: string;
    icon: React.ElementType;
    badgeClass: string;
    barClass: string;
    cardClass: string;
    iconBgClass: string;
    iconClass: string;
    labelColor: string;
  }
> = {
  not_started: {
    label: "Not started",
    icon: Circle,
    badgeClass: "text-slate-400 bg-slate-50 border-slate-200",
    barClass: "bg-slate-200",
    cardClass: "border-slate-100 bg-white",
    iconBgClass: "bg-slate-100",
    iconClass: "text-slate-400",
    labelColor: "text-slate-800",
  },
  in_progress: {
    label: "In progress",
    icon: Clock,
    badgeClass: "text-amber-600 bg-amber-50 border-amber-200",
    barClass: "bg-amber-400 animate-pulse",
    cardClass: "border-amber-100 bg-amber-50/20",
    iconBgClass: "bg-amber-100",
    iconClass: "text-amber-600",
    labelColor: "text-slate-800",
  },
  built: {
    label: "Built",
    icon: CheckCircle2,
    badgeClass: "text-emerald-600 bg-emerald-50 border-emerald-200",
    barClass: "bg-emerald-500",
    cardClass: "border-emerald-100 bg-emerald-50/30",
    iconBgClass: "bg-emerald-100",
    iconClass: "text-emerald-600",
    labelColor: "text-emerald-800",
  },
};

const STATUS_CYCLE: SyncComponentStatus[] = ["not_started", "in_progress", "built"];

export function BuildSyncComponents({
  projectId,
  employeeUpsertStatus,
  leaveSyncStatus,
  paySlipStatus,
  isAdmin,
  layout = "list",
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

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-3 gap-3">
        {SYNC_COMPONENTS.map(({ key, label, description, icon: Icon }) => {
          const status = statuses[key];
          const config = STATUS_CONFIG[status];
          const StatusIcon = config.icon;
          const isUpdating = updating === key;

          return (
            <div
              key={key}
              className={cn(
                "relative rounded-2xl border overflow-hidden flex flex-col p-4 gap-3 transition-all duration-200",
                config.cardClass,
                isAdmin && "cursor-pointer hover:shadow-md",
                isUpdating && "opacity-60"
              )}
              onClick={() => isAdmin && cycleStatus(key)}
              title={isAdmin ? "Click to advance status" : undefined}
            >
              {/* Top accent bar */}
              <div
                className={cn("absolute top-0 left-0 right-0 h-[3px]", config.barClass)}
              />

              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1",
                  config.iconBgClass
                )}
              >
                <Icon className={cn("w-5 h-5", config.iconClass)} />
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className={cn("text-sm font-bold leading-snug", config.labelColor)}>
                  {label}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
              </div>

              {/* Status badge at bottom */}
              <div
                className={cn(
                  "self-start flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                  config.badgeClass
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: list layout (admin)
  return (
    <div className="space-y-2.5">
      {SYNC_COMPONENTS.map(({ key, label, description, icon: Icon }) => {
        const status = statuses[key];
        const config = STATUS_CONFIG[status];
        const StatusIcon = config.icon;
        const isUpdating = updating === key;

        return (
          <div
            key={key}
            className={cn(
              "relative rounded-xl border overflow-hidden transition-all duration-200",
              config.cardClass,
              isAdmin && "cursor-pointer hover:shadow-sm",
              isUpdating && "opacity-60"
            )}
            onClick={() => isAdmin && cycleStatus(key)}
            title={isAdmin ? "Click to advance status" : undefined}
          >
            {/* Left accent bar */}
            <div
              className={cn("absolute left-0 top-0 bottom-0 w-[3px]", config.barClass)}
            />

            <div className="flex items-center gap-3 px-4 py-3 pl-5">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  config.iconBgClass
                )}
              >
                <Icon className={cn("w-4 h-4", config.iconClass)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{description}</p>
              </div>

              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0",
                  config.badgeClass
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
