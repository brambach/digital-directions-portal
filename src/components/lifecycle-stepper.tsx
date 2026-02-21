"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, Lock, ChevronRight } from "lucide-react";
import { LIFECYCLE_STAGES, stageSlug } from "@/lib/lifecycle";

export interface LifecycleStage {
  key: string;
  label: string;
  status: "locked" | "active" | "review" | "complete";
}

export interface LifecycleStepperProps {
  currentStage: string;
  projectId: string;
  basePath: string; // e.g. "/dashboard/admin/projects" or "/dashboard/client/projects"
  stages?: LifecycleStage[];
  className?: string;
}

export function LifecycleStepper({
  currentStage,
  projectId,
  basePath,
  stages,
  className,
}: LifecycleStepperProps) {
  const resolvedStages: LifecycleStage[] = stages ?? deriveStages(currentStage);

  const completedCount = resolvedStages.filter((s) => s.status === "complete").length;
  const progressPct = Math.round((completedCount / resolvedStages.length) * 100);

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 p-6 shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-bold text-slate-800">Project Lifecycle</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {completedCount} of {resolvedStages.length} stages complete
          </p>
          <p className="text-[11px] text-violet-400 mt-0.5 font-medium">
            Click any stage to view details
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#7C1CFF] transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[13px] font-bold text-[#7C1CFF] tabular-nums">{progressPct}%</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100 z-0" />
        <div
          className="absolute top-4 left-4 h-0.5 bg-[#7C1CFF] z-0 transition-all duration-700 ease-out"
          style={{ width: `${getConnectorWidth(resolvedStages)}%` }}
        />

        {/* Stage nodes */}
        <div className="relative z-10 flex justify-between">
          {resolvedStages.map((stage) => {
            const slug = stageSlug(stage.key);
            const isClickable = stage.status !== "locked" && slug !== null;
            const href = isClickable ? `${basePath}/${projectId}/${slug}` : undefined;

            const nodeContent = (
              <div className={cn(
                "flex flex-col items-center group",
                isClickable && "cursor-pointer"
              )}>
                {/* Node */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                    stage.status === "complete" && "bg-[#7C1CFF] border-[#7C1CFF] text-white",
                    stage.status === "active" && "bg-white border-[#7C1CFF] ring-4 ring-violet-100",
                    stage.status === "review" && "bg-amber-50 border-amber-400",
                    stage.status === "locked" && "bg-slate-50 border-slate-200 text-slate-300",
                    isClickable && "group-hover:scale-110 group-hover:shadow-md group-hover:shadow-violet-200/50"
                  )}
                >
                  {stage.status === "complete" ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : stage.status === "active" ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7C1CFF] animate-pulse" />
                  ) : stage.status === "review" ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  ) : (
                    <Lock className="w-3 h-3" strokeWidth={2} />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-2.5 text-[10px] font-semibold text-center leading-tight max-w-[72px] transition-colors",
                    stage.status === "complete" && "text-[#6316CC]",
                    stage.status === "active" && "text-[#7C1CFF] font-bold",
                    stage.status === "review" && "text-amber-600",
                    stage.status === "locked" && "text-slate-400",
                    isClickable && "group-hover:text-[#7C1CFF]"
                  )}
                >
                  {stage.label}
                </span>

                {/* View indicator */}
                {isClickable && (
                  <span className="mt-1 text-[9px] text-slate-300 group-hover:text-violet-500 transition-colors flex items-center gap-0.5">
                    View <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            );

            if (href) {
              return (
                <Link key={stage.key} href={href} className="no-underline">
                  {nodeContent}
                </Link>
              );
            }

            return <div key={stage.key}>{nodeContent}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

function deriveStages(currentStage: string): LifecycleStage[] {
  const currentIndex = LIFECYCLE_STAGES.findIndex((s) => s.key === currentStage);

  return LIFECYCLE_STAGES.map((stage, i) => ({
    key: stage.key,
    label: stage.label,
    status: i < currentIndex ? "complete" : i === currentIndex ? "active" : "locked",
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
  return (targetIndex / (stages.length - 1)) * 100;
}
