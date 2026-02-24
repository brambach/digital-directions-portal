"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatPanelProps {
  isOpen: boolean;
  projects: Array<{ id: string; name: string }>;
  selectedProjectId: string | undefined;
  onProjectChange: (projectId: string | undefined) => void;
  children: React.ReactNode;
}

export function ChatPanel({
  isOpen,
  projects,
  selectedProjectId,
  onProjectChange,
  children,
}: ChatPanelProps) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[9997] bg-black/20 backdrop-blur-sm transition-opacity duration-300 sm:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      <div
        className={cn(
          "fixed z-[9998] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out",
          "right-6 bottom-24 w-[400px] h-[560px]",
          "max-sm:inset-x-4 max-sm:bottom-24 max-sm:top-4 max-sm:w-auto max-sm:h-auto max-sm:right-4",
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-3 scale-[0.97] pointer-events-none"
        )}
        role="dialog"
        aria-label="Digi chat assistant"
      >
        {/* Header with gradient */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-100/50 flex-shrink-0 bg-gradient-to-r from-white via-violet-50/30 to-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/digi/digi_neutral.png"
            alt="Digi"
            className="w-8 h-8 object-contain"
            draggable={false}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-900">Digi</p>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
            </div>
            <p className="text-[11px] text-slate-400">AI Support Assistant</p>
          </div>
          {projects.length > 1 && (
            <Select
              value={selectedProjectId || "all"}
              onValueChange={(val) =>
                onProjectChange(val === "all" ? undefined : val)
              }
            >
              <SelectTrigger className="w-[140px] h-8 text-xs border-slate-200">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {children}
      </div>
    </>
  );
}
