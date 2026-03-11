"use client";

import { useState, useEffect } from "react";
import type { ChangelogEntry } from "@/lib/changelog";
import { CHANGELOG_LS_KEY } from "@/lib/changelog";
import { ChangelogEntryCard } from "@/components/changelog-entry";
import { DigiMascot } from "@/components/digi-mascot";

interface ChangelogPageClientProps {
  entries: ChangelogEntry[];
  latestDate: string;
  showAdminLabels?: boolean;
}

export function ChangelogPageClient({
  entries,
  latestDate,
  showAdminLabels,
}: ChangelogPageClientProps) {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CHANGELOG_LS_KEY);
    setLastSeen(stored);
    setMounted(true);

    // Mark as seen
    if (latestDate) {
      localStorage.setItem(CHANGELOG_LS_KEY, latestDate);
    }
  }, [latestDate]);

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
      {entries.map((entry) => (
        <ChangelogEntryCard
          key={entry.id}
          entry={entry}
          isNew={mounted && lastSeen !== null && lastSeen < entry.date}
          showAdminLabels={showAdminLabels}
        />
      ))}
    </div>
  );
}
