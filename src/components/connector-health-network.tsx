"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

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
  healthy: {
    dot: "bg-emerald-500",
    line: "bg-emerald-300",
    pulse: "bg-emerald-400",
    accent: "bg-emerald-400",
    label: "Operational",
    badge: "bg-emerald-50 text-emerald-700",
  },
  degraded: {
    dot: "bg-amber-500",
    line: "bg-amber-300",
    pulse: "bg-amber-400",
    accent: "bg-amber-400",
    label: "Degraded",
    badge: "bg-amber-50 text-amber-700",
  },
  down: {
    dot: "bg-red-500",
    line: "bg-red-300",
    pulse: "bg-red-400",
    accent: "bg-red-400",
    label: "Down",
    badge: "bg-red-50 text-red-700",
  },
  unknown: {
    dot: "bg-slate-400",
    line: "bg-slate-200",
    pulse: "bg-slate-300",
    accent: "bg-slate-300",
    label: "Unknown",
    badge: "bg-slate-50 text-slate-600",
  },
} as const;

function worst(a: IntegrationStatus, b: IntegrationStatus): IntegrationStatus {
  const r: Record<IntegrationStatus, number> = {
    down: 0,
    degraded: 1,
    unknown: 2,
    healthy: 3,
  };
  return r[a] <= r[b] ? a : b;
}

const CSS = `
  @keyframes connPulse {
    0%   { left: 0; opacity: 0; }
    5%   { opacity: 0.7; }
    95%  { opacity: 0.3; }
    100% { left: calc(100% - 4px); opacity: 0; }
  }
`;

// ─── Component ──────────────────────────────────────────────────────────────

export function ConnectorHealthNetwork({
  integrations,
}: {
  integrations: IntegrationNode[];
}) {
  const source =
    integrations.find((i) => i.abbr === "HB") ?? integrations[0];
  const hub =
    integrations.find((i) => i.abbr === "WK") ?? integrations[1];
  const dests = integrations.filter(
    (i) => i.abbr !== "HB" && i.abbr !== "WK"
  );
  const srcHubStatus = worst(source.status, hub.status);

  // Pair destinations into rows of 2 for compact grid
  const destRows: IntegrationNode[][] = [];
  for (let i = 0; i < dests.length; i += 2) {
    destRows.push(dests.slice(i, i + 2));
  }
  const numRows = destRows.length;

  return (
    <div style={{ minWidth: 580 }}>
      <style>{CSS}</style>

      {/* Column labels */}
      <div
        className="grid mb-3"
        style={{ gridTemplateColumns: "110px 40px 150px 44px 1fr" }}
      >
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Source
        </span>
        <span />
        <span className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">
          Orchestrator
        </span>
        <span />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Destinations
        </span>
      </div>

      {/* Flow grid — no row gap; spacers handle spacing */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "110px 40px 150px 44px 1fr",
          gridTemplateRows: `repeat(${numRows}, auto)`,
        }}
      >
        {/* ── Source (HiBob) ── */}
        <div
          style={{
            gridColumn: 1,
            gridRow: `1 / ${numRows + 1}`,
            alignSelf: "center",
          }}
        >
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  S[source.status].dot
                )}
              />
              <span className="text-[13px] font-semibold text-slate-800">
                {source.name}
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">
              HR Platform
            </p>
            <p className="text-[11px] text-slate-600 font-medium">
              {source.uptime} uptime
            </p>
            <p className="text-[10px] text-slate-400">{source.lastChecked}</p>
          </div>
        </div>

        {/* ── Source → Hub line ── */}
        <div
          style={{
            gridColumn: 2,
            gridRow: `1 / ${numRows + 1}`,
            alignSelf: "center",
          }}
        >
          <FlowLine status={srcHubStatus} speed="3s" />
        </div>

        {/* ── Hub (Workato) — purple branded, prominent ── */}
        <div
          style={{
            gridColumn: 3,
            gridRow: `1 / ${numRows + 1}`,
            alignSelf: "center",
          }}
          className="relative"
        >
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-purple-50/30 p-3.5 shadow-sm shadow-violet-100/40">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full flex-shrink-0",
                  S[hub.status].dot
                )}
              />
              <span className="text-[14px] font-bold text-slate-900">
                {hub.name}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-2">
              Orchestrator
            </p>

            <div
              className={cn(
                "inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full",
                S[hub.status].badge
              )}
            >
              {S[hub.status].label}
            </div>

            <div className="mt-2.5 pt-2 border-t border-violet-100/60 space-y-0.5">
              <p className="text-[11px] text-slate-600 font-medium">
                {hub.uptime} uptime
              </p>
              <p className="text-[10px] text-slate-400">{hub.lastChecked}</p>
              {hub.incident && (
                <p className="text-[10px] text-amber-600 font-medium mt-1">
                  {hub.incident}
                </p>
              )}
            </div>
          </div>

          {/* Anchor dot — right edge connection point */}
          <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-violet-200 border-2 border-white shadow-sm z-10" />
        </div>

        {/* ── Destination rows (2 cards per row) ── */}
        {destRows.map((pair, rowIdx) => {
          const isFirst = rowIdx === 0;
          const isLast = rowIdx === destRows.length - 1;
          // Branch color = worst of hub + all destinations in this row
          const rowStatus = pair.reduce(
            (acc, dest) => worst(acc, dest.status),
            hub.status
          );

          return (
            <Fragment key={rowIdx}>
              {/* Connection cell (vertical trunk + horizontal branch) */}
              <div
                style={{ gridColumn: 4, gridRow: rowIdx + 1 }}
                className="flex flex-col"
              >
                {/* Gap spacer with trunk line through it */}
                {!isFirst && (
                  <div className="h-2.5 relative">
                    <div className="absolute left-[1px] inset-y-0 w-[2px] bg-slate-200 rounded-full" />
                  </div>
                )}

                {/* Branch area — stretches to match destination row height */}
                <div className="flex-1 relative flex items-center min-h-[48px]">
                  {/* Vertical trunk: top half */}
                  {!isFirst && (
                    <div className="absolute left-[1px] top-0 h-1/2 w-[2px] bg-slate-200" />
                  )}
                  {/* Vertical trunk: bottom half */}
                  {!isLast && (
                    <div className="absolute left-[1px] top-1/2 bottom-0 w-[2px] bg-slate-200" />
                  )}
                  {/* Horizontal branch — color reflects row connection health */}
                  <div className="w-full ml-[2px]">
                    <FlowLine status={rowStatus} speed="2.5s" />
                  </div>
                </div>
              </div>

              {/* Destination pair */}
              <div
                style={{ gridColumn: 5, gridRow: rowIdx + 1 }}
                className="flex flex-col"
              >
                {!isFirst && <div className="h-2.5" />}
                <div className="flex-1 flex items-center">
                  <div className="w-full flex gap-2.5">
                    {pair.map((dest) => (
                        <div
                          key={dest.id}
                          className="flex-1 rounded-lg border border-slate-100 bg-white overflow-hidden flex min-w-0"
                        >
                          {/* Status accent bar */}
                          <div
                            className={cn(
                              "w-1 flex-shrink-0",
                              S[dest.status].accent
                            )}
                          />
                          {/* Card content */}
                          <div className="flex-1 px-3 py-2.5 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    S[dest.status].dot
                                  )}
                                />
                                <span className="text-[12px] font-semibold text-slate-800 truncate">
                                  {dest.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-500 tabular-nums flex-shrink-0">
                                {dest.uptime}
                              </span>
                            </div>
                          </div>
                        </div>
                    ))}
                    {/* Spacer for odd destination count */}
                    {pair.length === 1 && <div className="flex-1" />}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Flow Line ─────────────────────────────────────────────────────────────
// Horizontal connection line with status-based color and optional pulse

function FlowLine({
  status,
  speed,
}: {
  status: IntegrationStatus;
  speed: string;
}) {
  const s = S[status];
  const animated = status === "healthy";

  return (
    <div className="px-1">
      <div className="relative h-[2px] w-full overflow-hidden rounded-full">
        {/* Base line */}
        {status === "down" ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, #fca5a5 0, #fca5a5 4px, transparent 4px, transparent 8px)",
            }}
          />
        ) : (
          <div className={cn("absolute inset-0", s.line)} />
        )}

        {/* Subtle left-to-right pulse — healthy connections only */}
        {animated &&
          [0, 1].map((j) => (
            <div
              key={j}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full",
                s.pulse
              )}
              style={{
                animation: `connPulse ${speed} ease-in-out infinite`,
                animationDelay: `${j * 1.4}s`,
              }}
            />
          ))}
      </div>
    </div>
  );
}
