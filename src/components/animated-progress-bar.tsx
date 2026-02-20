"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedProgressBarProps {
  /** Target percentage (0–100) */
  pct: number;
  /** Tailwind bg colour class e.g. "bg-violet-500" */
  color: string;
  /** How long to wait before the bar starts filling (ms) */
  delayMs?: number;
}

export function AnimatedProgressBar({ pct, color, delayMs = 500 }: AnimatedProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delayMs);
    return () => clearTimeout(t);
  }, [pct, delayMs]);

  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full", color)}
        style={{
          width: `${width}%`,
          transition: "width 900ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}
