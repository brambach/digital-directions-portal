"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedBarProps {
  width: number;
  className?: string;
  delay?: number;
}

export function AnimatedBar({ width, className, delay = 0 }: AnimatedBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className="h-full w-full">
      <motion.div
        className={cn("h-full rounded-full", className)}
        initial={{ width: 0 }}
        animate={inView ? { width: `${width}%` } : { width: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay }}
      />
    </div>
  );
}

interface AnimatedSegmentBarProps {
  segments: { color: string; pct: number; key: string }[];
  className?: string;
}

export function AnimatedSegmentBar({ segments, className }: AnimatedSegmentBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className={cn("flex h-3 rounded-full overflow-hidden bg-slate-100", className)}>
      {segments.map((seg, i) => {
        if (seg.pct === 0) return null;
        return (
          <motion.div
            key={seg.key}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", seg.color)}
            initial={{ width: 0 }}
            animate={inView ? { width: `${seg.pct}%` } : { width: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.08 }}
          />
        );
      })}
    </div>
  );
}
