"use client";

import { useState } from "react";
import { Check, Link } from "lucide-react";
import type { ChangelogEntry } from "@/lib/changelog";
import { cn } from "@/lib/utils";

const TAG_STYLES: Record<string, string> = {
  feature: "bg-violet-50 text-violet-700",
  fix: "bg-red-50 text-red-600",
  improvement: "bg-sky-50 text-sky-700",
  internal: "bg-slate-100 text-slate-500",
};

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  isNew?: boolean;
  showAdminLabels?: boolean;
}

export function ChangelogEntryCard({
  entry,
  isNew,
  showAdminLabels,
}: ChangelogEntryCardProps) {
  const [copied, setCopied] = useState(false);

  const displayDate = new Date(entry.date + "T00:00:00");
  const month = displayDate.toLocaleDateString("en-AU", { month: "short" });
  const day = displayDate.getDate();

  function handleCopyAnchor() {
    const url = `${window.location.origin}${window.location.pathname}#${entry.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div id={entry.id} className="flex gap-6">
      {/* Left column — date + timeline */}
      <div className="flex flex-col items-center w-16 flex-shrink-0 pt-1">
        <button
          onClick={handleCopyAnchor}
          title="Copy link to this entry"
          className="text-center group relative"
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-violet-400 transition-colors">
            {month}
          </p>
          <p className="text-lg font-bold text-slate-700 leading-tight group-hover:text-violet-600 transition-colors">
            {day}
          </p>
          <span
            className={cn(
              "absolute -right-4 top-1/2 -translate-y-1/2 transition-all",
              copied ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
            )}
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Link className="w-3 h-3 text-violet-400" />
            )}
          </span>
        </button>
        {entry.version && (
          <span className="mt-1.5 text-[10px] font-semibold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">
            {entry.version}
          </span>
        )}
        {/* Timeline dot + stem */}
        <div className="flex flex-col items-center mt-3 flex-1">
          <div className="w-2 h-2 rounded-full bg-violet-300 flex-shrink-0" />
          <div className="flex-1 w-px bg-slate-200 mt-1" />
        </div>
      </div>

      {/* Right column — card */}
      <div className="flex-1 pb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          {/* Left accent bar */}
          <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#7C1CFF] rounded-r-full" />

          <div className="p-5 pl-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-bold text-slate-900 text-sm leading-tight">
                {entry.title}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isNew && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-violet-100 text-violet-600">
                    NEW
                  </span>
                )}
                {showAdminLabels && entry.audience === "admin" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500">
                    Admin only
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-500 mb-3">{entry.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {entry.tags
                .filter((tag) => showAdminLabels || tag !== "internal")
                .map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize",
                      TAG_STYLES[tag] ?? TAG_STYLES.improvement
                    )}
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {/* Items */}
            {entry.items.length > 0 && (
              <ul className="space-y-1.5">
                {entry.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-slate-600 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-300 mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
