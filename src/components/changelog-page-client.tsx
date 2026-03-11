"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wrench, Zap, Lock } from "lucide-react";
import type { ChangelogEntry, ChangelogTag } from "@/lib/changelog";
import { CHANGELOG_LS_KEY } from "@/lib/changelog";
import { ChangelogEntryCard } from "@/components/changelog-entry";
import { DigiMascot } from "@/components/digi-mascot";
import { cn } from "@/lib/utils";

interface ChangelogPageClientProps {
  entries: ChangelogEntry[];
  latestDate: string;
  showAdminLabels?: boolean;
}

type FilterTag = ChangelogTag | "all";

const FILTER_OPTIONS: { value: FilterTag; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
  { value: "feature", label: "Features", icon: <Sparkles className="w-3 h-3" /> },
  { value: "improvement", label: "Improvements", icon: <Zap className="w-3 h-3" /> },
  { value: "fix", label: "Fixes", icon: <Wrench className="w-3 h-3" /> },
  { value: "internal", label: "Internal", icon: <Lock className="w-3 h-3" /> },
];

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export function ChangelogPageClient({
  entries,
  latestDate,
  showAdminLabels,
}: ChangelogPageClientProps) {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTag>("all");

  useEffect(() => {
    const stored = localStorage.getItem(CHANGELOG_LS_KEY);
    setLastSeen(stored);
    setMounted(true);
    if (latestDate) {
      localStorage.setItem(CHANGELOG_LS_KEY, latestDate);
    }
  }, [latestDate]);

  // Stats
  const stats = useMemo(() => {
    const counts = { feature: 0, improvement: 0, fix: 0, internal: 0 };
    for (const entry of entries) {
      for (const tag of entry.tags) {
        if (tag in counts) counts[tag as keyof typeof counts]++;
      }
    }
    return counts;
  }, [entries]);

  // Filter
  const filteredEntries = useMemo(() => {
    if (activeFilter === "all") return entries;
    return entries.filter((e) => e.tags.includes(activeFilter as ChangelogTag));
  }, [entries, activeFilter]);

  // Group by month
  const groupedEntries = useMemo(() => {
    const groups: { month: string; entries: ChangelogEntry[] }[] = [];
    for (const entry of filteredEntries) {
      const month = getMonthLabel(entry.date);
      const last = groups[groups.length - 1];
      if (last && last.month === month) {
        last.entries.push(entry);
      } else {
        groups.push({ month, entries: [entry] });
      }
    }
    return groups;
  }, [filteredEntries]);

  // Hide "Internal" tab for non-admins
  const filterOptions = showAdminLabels
    ? FILTER_OPTIONS
    : FILTER_OPTIONS.filter((o) => o.value !== "internal");

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <DigiMascot variant="sleeping" size="md" className="mb-4" />
        <p className="text-sm font-semibold text-slate-500">
          Nothing here yet — check back after the next release
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Stats banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap gap-3 mb-6"
      >
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Total updates</span>
          <span className="text-sm font-bold text-slate-800">{entries.length}</span>
        </div>
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-semibold text-violet-600">{stats.feature} features</span>
        </div>
        <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-4 py-2.5">
          <Zap className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-xs font-semibold text-sky-600">{stats.improvement} improvements</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <Wrench className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-semibold text-red-600">{stats.fix} fixes</span>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-wrap gap-2 mb-8"
      >
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all",
              activeFilter === opt.value
                ? "bg-[#7C1CFF] border-[#7C1CFF] text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </motion.div>

      {/* Entries grouped by month */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <DigiMascot variant="confused" size="md" className="mb-4" />
          <p className="text-sm font-semibold text-slate-500">No entries for this filter</p>
        </div>
      ) : (
        groupedEntries.map((group, gi) => (
          <div key={group.month}>
            {/* Month header */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: gi * 0.04 }}
              className="flex items-center gap-3 mb-5"
            >
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                {group.month}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </motion.div>

            {/* Entries */}
            {group.entries.map((entry, ei) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: gi * 0.04 + ei * 0.06,
                  ease: "easeOut",
                }}
              >
                <ChangelogEntryCard
                  entry={entry}
                  isNew={mounted && lastSeen !== null && lastSeen < entry.date}
                  showAdminLabels={showAdminLabels}
                />
              </motion.div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
