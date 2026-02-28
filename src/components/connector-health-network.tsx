"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type IntegrationStatus = "healthy" | "degraded" | "down" | "unknown";

interface IntegrationNode {
  id: string;
  name: string;
  abbr: string;
  status: IntegrationStatus;
  lastChecked: string;
  uptime: string;
  incident?: string;
}

// ─── Status styling ─────────────────────────────────────────────────────────

const S = {
  healthy:  { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", label: "Operational", ping: "bg-emerald-400", accent: "border-l-emerald-400" },
  degraded: { dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700",     label: "Degraded",    ping: "bg-amber-400",   accent: "border-l-amber-400" },
  down:     { dot: "bg-red-500",     badge: "bg-red-50 text-red-700",         label: "Down",        ping: "bg-red-400",     accent: "border-l-red-500" },
  unknown:  { dot: "bg-slate-400",   badge: "bg-slate-50 text-slate-600",     label: "Unknown",     ping: "bg-slate-300",   accent: "border-l-slate-300" },
} as const;

// ─── StatusDot ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: IntegrationStatus }) {
  return (
    <span className="relative flex flex-shrink-0">
      {status === "healthy" && (
        <span className={cn("absolute inline-flex w-2 h-2 rounded-full animate-pulse-slow opacity-50", S.healthy.ping)} />
      )}
      <span className={cn("relative w-2 h-2 rounded-full", S[status].dot)} />
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ConnectorHealthNetwork({
  integrations,
}: {
  integrations: IntegrationNode[];
}) {
  const source = integrations.find((i) => i.abbr === "HB") ?? integrations[0];
  const hub = integrations.find((i) => i.abbr === "WK") ?? integrations[1];
  const dests = integrations.filter((i) => i.abbr !== "HB" && i.abbr !== "WK");

  return (
    <div className="space-y-4">
      {/* Mini flow indicator */}
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="flex items-center gap-1">
          <StatusDot status={source.status} />
          <span className="font-semibold text-slate-700">{source.abbr}</span>
        </span>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="flex items-center gap-1">
          <StatusDot status={hub.status} />
          <span className="font-bold text-violet-600">{hub.abbr}</span>
        </span>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-400 font-medium">{dests.length} system{dests.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Service rows */}
      <div className="space-y-1.5">
        {integrations.map((node, idx) => (
          <motion.div
            key={node.id}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-l-2 bg-white border border-slate-100",
              S[node.status].accent
            )}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06, type: "spring", stiffness: 300, damping: 28 }}
          >
            {/* Status dot */}
            <StatusDot status={node.status} />

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-slate-800 truncate">{node.name}</span>
                {node.id === "workato" && (
                  <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">Hub</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[10px] font-semibold px-1.5 py-px rounded-full", S[node.status].badge)}>
                  {S[node.status].label}
                </span>
                <span className="text-[10px] text-slate-400">{node.lastChecked}</span>
              </div>
              {node.incident && (
                <p className="text-[10px] text-amber-600 font-medium mt-1 truncate">{node.incident}</p>
              )}
            </div>

            {/* Uptime */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[13px] font-bold text-slate-800 tabular-nums">{node.uptime}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">uptime</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
