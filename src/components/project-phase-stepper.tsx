"use client";

import { useEffect, useState } from "react";
import { Check, Flag, Rocket, Clock, Settings, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Phase {
  id: string;
  name: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "skipped";
  orderIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null; // Assuming we might have this or use created/started as proxy
  notes: string | null;
}

interface ProjectPhaseStepperProps {
  projectId: string;
  isAdmin?: boolean;
  onPhaseClick?: (phase: Phase) => void;
  onApplyTemplate?: () => void;
  onManagePhases?: () => void;
}

export function ProjectPhaseStepper({
  projectId,
  isAdmin = false,
  onPhaseClick,
  onApplyTemplate,
  onManagePhases,
}: ProjectPhaseStepperProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhases = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/phases`);
      if (response.ok) {
        const data = await response.json();
        // Mocking dates if missing for the visual demo based on inspiration
        // In a real app, these would come from the DB
        setPhases(data);
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-8">
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              <div className="h-4 w-12 bg-gray-200 rounded"></div>
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
          <Flag className="w-6 h-6" />
        </div>
        <h3 className="text-gray-900 font-bold text-base mb-1">No Project Timeline</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">This project hasn't been set up with a roadmap yet.</p>

        {isAdmin && (
          <Button size="sm" onClick={onApplyTemplate} className="rounded-xl font-semibold">
            Launch Phase Wizard
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar px-4">
      {isAdmin && onManagePhases && (
        <div className="absolute top-0 right-0 z-10">
          <Button variant="ghost" size="sm" onClick={onManagePhases} className="text-gray-400 hover:text-[#6366F1]">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="min-w-[800px] relative mt-6">
        {/* Main Progress Bar Background */}
        <div className="absolute top-[58px] left-0 w-full h-3 bg-[#EEF2FF] rounded-full -z-10"></div>

        {/* Active Progress Bar (Calculated width) */}
        <div
          className="absolute top-[58px] left-0 h-3 bg-[#10B981] rounded-full -z-10 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-1000"
          style={{
            width: `${(phases.filter(p => p.status === 'completed').length / (phases.length - 1)) * 100}%`
          }}
        ></div>

        <div className="flex justify-between relative">
          {phases.map((phase, index) => {
            const isCompleted = phase.status === "completed";
            const isCurrent = phase.status === "in_progress";
            const isPending = phase.status === "pending" || phase.status === "skipped";
            const isFirst = index === 0;
            const isLast = index === phases.length - 1;

            return (
              <div key={phase.id} className="flex flex-col items-center group relative">
                {/* Top Date Label */}
                <div className={cn(
                  "h-8 flex items-end justify-center mb-4 text-xs font-bold transition-colors duration-300 transform group-hover:-translate-y-1",
                  isCompleted ? "text-[#10B981]" : isCurrent ? "text-[#6366F1]" : "text-gray-400"
                )}>
                  {phase.startedAt
                    ? format(new Date(phase.startedAt), "MMM d")
                    : phase.dueDate
                      ? format(new Date(phase.dueDate), "MMM d")
                      : `Step ${index + 1}`}
                </div>

                {/* Node Circle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => isAdmin && onPhaseClick?.(phase)}
                        disabled={!isAdmin}
                        className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center border-[4px] transition-all duration-300 relative z-10 bg-white",
                          isCompleted ? "border-[#10B981] text-[#10B981] shadow-lg shadow-emerald-100 scale-100" :
                            isCurrent ? "border-[#6366F1] text-[#6366F1] shadow-xl shadow-indigo-200 scale-110 ring-4 ring-indigo-50" :
                              "border-gray-100 text-gray-300"
                        )}
                      >
                        {/* Icon Logic */}
                        {isFirst ? (
                          <Rocket className={cn("w-6 h-6", isCompleted || isCurrent ? "fill-current" : "")} />
                        ) : isLast ? (
                          <Flag className={cn("w-6 h-6", isCompleted ? "fill-current" : "")} />
                        ) : isCompleted ? (
                          <Check className="w-7 h-7 stroke-[3px]" />
                        ) : isCurrent ? (
                          <div className="flex flex-col items-center justify-center leading-none">
                            <Clock className="w-5 h-5 mb-0.5 animate-pulse" />
                          </div>
                        ) : (
                          <span className="text-lg font-bold">{index + 1}</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold">{phase.name}</p>
                      <p className="text-xs text-gray-400">{phase.status.replace("_", " ")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Marker Line */}
                {isCurrent && (
                  <div className="absolute top-[80px] w-0.5 h-6 bg-[#6366F1]/30 rounded-full animate-bounce"></div>
                )}

                {/* Flag Marker (If 'Timeline for Accord' style) */}
                {isCurrent && (
                  <div className="absolute top-[28px] -right-3">
                    <div className="w-3 h-3 bg-[#6366F1] rounded-full border-2 border-white shadow-sm animate-ping"></div>
                  </div>
                )}

                {/* Bottom Labels */}
                <div className="mt-6 text-center max-w-[120px]">
                  <p className={cn(
                    "text-sm font-bold leading-tight mb-1 transition-colors",
                    isCompleted ? "text-gray-900" : isCurrent ? "text-[#6366F1]" : "text-gray-400"
                  )}>
                    {phase.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium line-clamp-2 leading-relaxed">
                    {phase.description || "No description"}
                  </p>
                  {isAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                      <span className="text-[10px] font-bold text-[#6366F1] cursor-pointer hover:underline">Edit Phase</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Remaining Pill (Mock based on image 'Left: 5 Months') */}
        <div className="flex justify-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm font-bold text-gray-500">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>Est. Completion: 2 Months</span>
          </div>
        </div>
      </div>
    </div>
  );
}
