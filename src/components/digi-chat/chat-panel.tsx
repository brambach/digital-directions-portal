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
    <div
      className={cn(
        "fixed z-[9998] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
        "right-6 bottom-24 w-[400px] h-[560px]",
        "max-sm:inset-x-4 max-sm:bottom-24 max-sm:top-4 max-sm:w-auto max-sm:h-auto max-sm:right-4",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      role="dialog"
      aria-label="Digi chat assistant"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/digi/digi_neutral.png"
          alt="Digi"
          className="w-8 h-8 object-contain"
          draggable={false}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Digi</p>
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
  );
}
