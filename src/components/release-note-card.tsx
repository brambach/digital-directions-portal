"use client";

import { format } from "date-fns";
import { FileText, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReleaseNoteCardProps {
  note: {
    id: string;
    title: string;
    content: string;
    publishedAt: string | null;
    createdAt: string;
    phaseId?: string | null;
  };
  phaseName?: string | null;
  /** When true, shows a draft badge (admin view) */
  isDraft?: boolean;
  className?: string;
}

export function ReleaseNoteCard({
  note,
  phaseName,
  isDraft = false,
  className,
}: ReleaseNoteCardProps) {
  const displayDate = note.publishedAt ?? note.createdAt;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 relative overflow-hidden",
        isDraft && "border-dashed border-slate-300 bg-slate-50",
        className
      )}
    >
      {/* Left accent bar */}
      {!isDraft && (
        <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#7C1CFF] rounded-r-full" />
      )}

      <div className="pl-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-3.5 h-3.5 text-[#7C1CFF]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm leading-tight">
                {note.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isDraft ? "Draft" : format(new Date(displayDate), "d MMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isDraft && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                Draft
              </span>
            )}
            {phaseName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600">
                <Tag className="w-3 h-3" />
                {phaseName}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
          {note.content}
        </div>
      </div>
    </div>
  );
}
