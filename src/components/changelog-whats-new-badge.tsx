"use client";

import { useState, useEffect } from "react";
import { CHANGELOG_LS_KEY } from "@/lib/changelog";

interface ChangelogNavBadgeProps {
  latestDate: string;
}

export function ChangelogNavBadge({ latestDate }: ChangelogNavBadgeProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!latestDate) return;
    const seen = localStorage.getItem(CHANGELOG_LS_KEY);
    if (!seen || seen < latestDate) {
      setShow(true);
    }
  }, [latestDate]);

  if (!show) return null;

  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-violet-100 text-violet-600">
      NEW
    </span>
  );
}
