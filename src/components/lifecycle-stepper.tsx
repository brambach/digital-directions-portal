"use client";

import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";

const DEFAULT_STAGES = [
  { key: "pre_sales", label: "Pre-Sales" },
  { key: "discovery", label: "Discovery" },
  { key: "provisioning", label: "Provisioning" },
  { key: "hibob_config", label: "HiBob Config" },
  { key: "data_mapping", label: "Data Mapping" },
  { key: "integration_build", label: "Integration Build" },
  { key: "uat", label: "UAT" },
  { key: "go_live", label: "Go-Live" },
  { key: "support", label: "Support" },
];

export interface LifecycleStage {
  key: string;
  label: string;
  status: "locked" | "active" | "review" | "complete";
}

export interface LifecycleStepperProps {
  currentStage: string;
  stages?: LifecycleStage[];
  className?: string;
}

export function LifecycleStepper({ currentStage, stages, className }: LifecycleStepperProps) {
  // If no stages provided, derive from currentStage
  const resolvedStages: LifecycleStage[] = stages ?? deriveStages(currentStage);

  const completedCount = resolvedStages.filter((s) => s.status === "complete").length;
  const progressPct = Math.round((completedCount / resolvedStages.length) * 100);

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-bold text-slate-800">Project Lifecycle</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">{completedCount} of {resolvedStages.length} stages complete</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[13px] font-bold text-violet-600 tabular-nums">{progressPct}%</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100 z-0" />
        <div
          className="absolute top-4 left-4 h-0.5 bg-violet-500 z-0 transition-all duration-700 ease-out"
          style={{
            width: `${getConnectorWidth(resolvedStages)}%`,
          }}
        />

        {/* Stage nodes */}
        <div className="relative z-10 flex justify-between">
          {resolvedStages.map((stage) => (
            <div key={stage.key} className="flex flex-col items-center group">
              {/* Node */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                  stage.status === "complete" &&
                    "bg-violet-600 border-violet-600 text-white",
                  stage.status === "active" &&
                    "bg-white border-violet-500 ring-4 ring-violet-100",
                  stage.status === "review" &&
                    "bg-amber-50 border-amber-400",
                  stage.status === "locked" &&
                    "bg-slate-50 border-slate-200 text-slate-300"
                )}
              >
                {stage.status === "complete" ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : stage.status === "active" ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                ) : stage.status === "review" ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                ) : (
                  <Lock className="w-3 h-3" strokeWidth={2} />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2.5 text-[10px] font-semibold text-center leading-tight max-w-[64px] transition-colors",
                  stage.status === "complete" && "text-violet-700",
                  stage.status === "active" && "text-violet-600 font-bold",
                  stage.status === "review" && "text-amber-600",
                  stage.status === "locked" && "text-slate-400"
                )}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function deriveStages(currentStage: string): LifecycleStage[] {
  const currentIndex = DEFAULT_STAGES.findIndex((s) => s.key === currentStage);

  return DEFAULT_STAGES.map((stage, i) => ({
    ...stage,
    status:
      i < currentIndex
        ? "complete"
        : i === currentIndex
        ? "active"
        : "locked",
  }));
}

function getConnectorWidth(stages: LifecycleStage[]): number {
  const lastCompleteIndex = stages.reduce(
    (acc, s, i) => (s.status === "complete" ? i : acc),
    -1
  );
  const activeIndex = stages.findIndex((s) => s.status === "active");
  const targetIndex = activeIndex >= 0 ? activeIndex : lastCompleteIndex;

  if (targetIndex <= 0) return 0;
  // Calculate percentage based on position
  return (targetIndex / (stages.length - 1)) * 100;
}
