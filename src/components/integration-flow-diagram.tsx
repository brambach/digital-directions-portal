"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Settings, Zap, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ConfigureIntegrationDialog } from "@/components/configure-integration-dialog";
import { cn } from "@/lib/utils";

type Monitor = {
  id: string;
  serviceName: string;
  serviceType: string;
  currentStatus: string | null;
  isEnabled: boolean;
  lastCheckedAt: Date | null;
  lastErrorMessage: string | null;
};

const PAYROLL_META: Record<string, { name: string; role: string; abbr: string; from: string; to: string }> = {
  keypay:   { name: "KeyPay",   role: "Employment Hero",    abbr: "KP", from: "#3B82F6", to: "#1D4ED8" },
  myob:     { name: "MYOB",     role: "Payroll & Accounting", abbr: "MB", from: "#8B5CF6", to: "#6D28D9" },
  deputy:   { name: "Deputy",   role: "Workforce Mgmt",     abbr: "DP", from: "#10B981", to: "#047857" },
  netsuite: { name: "NetSuite", role: "ERP & Payroll",      abbr: "NS", from: "#60A5FA", to: "#1D4ED8" },
};

// ─── Status helpers ──────────────────────────────────────────────────────────

function statusColor(status: string | null) {
  switch (status) {
    case "healthy":  return { dot: "bg-emerald-400", glow: "shadow-emerald-400/40", label: "LIVE", labelColor: "text-emerald-600" };
    case "degraded": return { dot: "bg-amber-400",   glow: "shadow-amber-400/40",   label: "WARN", labelColor: "text-amber-600" };
    case "down":     return { dot: "bg-red-500",     glow: "shadow-red-500/40",     label: "DOWN", labelColor: "text-red-600" };
    default:         return { dot: "bg-slate-300",   glow: "",                       label: "",     labelColor: "text-slate-400" };
  }
}

function StatusIndicator({ status, lastCheckedAt }: { status: string | null; lastCheckedAt: Date | null }) {
  const s = statusColor(status);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "w-2 h-2 rounded-full shadow-md",
            s.dot,
            s.glow,
            status === "healthy" && "animate-pulse-slow"
          )}
        />
        {s.label && (
          <span className={cn("text-[9px] font-bold tracking-wider", s.labelColor)}>{s.label}</span>
        )}
      </div>
      {lastCheckedAt && (
        <div className="flex items-center gap-0.5 text-[9px] text-slate-400">
          <Clock className="w-2.5 h-2.5" />
          <span>{formatDistanceToNow(new Date(lastCheckedAt), { addSuffix: true })}</span>
        </div>
      )}
    </div>
  );
}

// ─── Connector with subtle shimmer ───────────────────────────────────────────

function FlowConnector({ active = true }: { active?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: 68, height: 8 }}>
      {/* Static gradient line */}
      <div
        className={cn(
          "absolute left-0 right-3 top-1/2 -translate-y-1/2 h-px",
          active
            ? "bg-gradient-to-r from-violet-200 via-violet-400 to-violet-300"
            : "bg-slate-200"
        )}
      />
      {/* Shimmer overlay */}
      {active && (
        <div
          className="absolute left-0 right-3 top-1/2 -translate-y-1/2 h-px animate-connector-shimmer"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(124,28,255,0.35) 50%, transparent 100%)",
            backgroundSize: "50% 100%",
          }}
        />
      )}
      {/* Arrowhead */}
      <div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-transparent",
          active ? "border-l-violet-400" : "border-l-slate-200"
        )}
      />
    </div>
  );
}

// ─── HiBob node ──────────────────────────────────────────────────────────────

function HiBobNode({ monitor, onClick, readOnly }: { monitor: Monitor | null; onClick: () => void; readOnly?: boolean }) {
  const Tag = readOnly ? "div" : "button";
  return (
    <Tag
      {...(!readOnly && { onClick })}
      className={cn(
        "group relative flex flex-col items-center gap-2 py-4 px-4 bg-white rounded-2xl border border-rose-100 shadow-sm transition-all flex-shrink-0",
        !readOnly && "hover:shadow-md hover:border-rose-200 cursor-pointer"
      )}
      style={{ width: 132 }}
    >
      {!readOnly && (
        <Settings className="absolute top-3 left-3 w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Logo */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-sm">
        <span className="text-sm font-black text-white tracking-tight">HB</span>
      </div>

      <div className="text-center">
        <p className="text-[13px] font-bold text-slate-800 leading-tight">HiBob</p>
        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">HRIS</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Source of Truth</p>
      </div>

      {/* Status section */}
      <div className="pt-1 border-t border-slate-100 w-full flex justify-center">
        <StatusIndicator status={monitor?.currentStatus ?? null} lastCheckedAt={monitor?.lastCheckedAt ?? null} />
      </div>
    </Tag>
  );
}

// ─── Workato node with subtle ambient glow ───────────────────────────────────

function WorkatoNode({ monitor, onClick, readOnly }: { monitor: Monitor | null; onClick: () => void; readOnly?: boolean }) {
  const Tag = readOnly ? "div" : "button";
  return (
    <motion.div
      className="relative flex-shrink-0"
      style={{ width: 148, overflow: "visible" }}
      animate={{
        boxShadow: [
          "0 0 16px 4px rgba(251,146,60,0.08)",
          "0 0 24px 8px rgba(251,146,60,0.18)",
          "0 0 16px 4px rgba(251,146,60,0.08)",
        ],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <Tag
        {...(!readOnly && { onClick })}
        className={cn(
          "group relative w-full flex flex-col items-center gap-2 py-4 px-4 bg-white rounded-2xl border border-orange-200 shadow-md transition-all",
          !readOnly && "hover:shadow-lg hover:border-orange-300 cursor-pointer"
        )}
      >
        {!readOnly && (
          <Settings className="absolute top-3 left-3 w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}

        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
          <Zap className="w-6 h-6 text-white fill-white" />
        </div>

        <div className="text-center">
          <p className="text-[13px] font-bold text-slate-800 leading-tight">Workato</p>
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mt-0.5">Middleware</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Integration Hub</p>
        </div>

        {/* Status section */}
        <div className="pt-1 border-t border-slate-100 w-full flex justify-center">
          <StatusIndicator status={monitor?.currentStatus ?? null} lastCheckedAt={monitor?.lastCheckedAt ?? null} />
        </div>
      </Tag>
    </motion.div>
  );
}

// ─── Connected system row ────────────────────────────────────────────────────

function ConnectedRow({ monitor, onClick, readOnly }: { monitor: Monitor; onClick: () => void; readOnly?: boolean }) {
  const meta = PAYROLL_META[monitor.serviceType] ?? {
    name: monitor.serviceName,
    role: "Connected System",
    abbr: monitor.serviceName.slice(0, 2).toUpperCase(),
    from: "#64748B",
    to: "#475569",
  };

  const Tag = readOnly ? "div" : "button";
  return (
    <Tag
      {...(!readOnly && { onClick })}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 transition-all group text-left",
        !readOnly && "hover:border-slate-200 hover:shadow-sm"
      )}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}
      >
        {meta.abbr}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-800 truncate">{meta.name}</p>
        <p className="text-[10px] text-slate-400">{meta.role}</p>
        <div className="mt-1">
          <StatusIndicator status={monitor.currentStatus} lastCheckedAt={monitor.lastCheckedAt} />
        </div>
      </div>
      {!readOnly && (
        <Settings className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" />
      )}
    </Tag>
  );
}

// ─── Connected systems panel ─────────────────────────────────────────────────

function ConnectedPanel({
  monitors,
  onAdd,
  onEdit,
  readOnly,
}: {
  monitors: Monitor[];
  onAdd: () => void;
  onEdit: (m: Monitor) => void;
  readOnly?: boolean;
}) {
  if (monitors.length === 0) {
    return (
      <div className="flex-1 min-w-[200px] flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
        <p className="text-[11px] font-semibold text-slate-400 text-center leading-relaxed">
          No connected systems<br />{readOnly ? "monitored yet" : "configured yet"}
        </p>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAdd}
            className="text-xs h-7 rounded-full border-slate-300 hover:border-[#7C1CFF] hover:text-[#7C1CFF]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add System
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[220px] bg-slate-50/60 rounded-2xl border border-slate-100 p-3">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected Systems</p>
        {!readOnly && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdd}
            className="h-6 px-2 text-[10px] font-bold text-[#7C1CFF] hover:text-[#7C1CFF] hover:bg-violet-50 rounded-full"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {monitors.map((m) => (
          <ConnectedRow key={m.id} monitor={m} onClick={() => onEdit(m)} readOnly={readOnly} />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface IntegrationFlowDiagramProps {
  projectId: string;
  clientId: string;
  integrations: Monitor[];
  readOnly?: boolean;
}

export function IntegrationFlowDiagram({
  projectId,
  clientId,
  integrations,
  readOnly,
}: IntegrationFlowDiagramProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Monitor | null>(null);

  const hibob    = integrations.find((i) => i.serviceType === "hibob")    ?? null;
  const workato  = integrations.find((i) => i.serviceType === "workato")  ?? null;
  const connected = integrations.filter(
    (i) => i.serviceType !== "hibob" && i.serviceType !== "workato"
  );

  function openDialog(m: Monitor | null) {
    if (readOnly) return;
    setSelected(m);
    setDialogOpen(true);
  }

  return (
    <>
      {/* Zone labels */}
      <div className="flex items-end gap-0 mb-3">
        <div
          className="text-[9px] font-bold text-rose-400 uppercase tracking-widest text-center flex-shrink-0"
          style={{ width: 132 }}
        >
          HRIS
        </div>
        <div className="flex-shrink-0" style={{ width: 68 }} />
        <div
          className="text-[9px] font-bold text-orange-400 uppercase tracking-widest text-center flex-shrink-0"
          style={{ width: 148 }}
        >
          Middleware
        </div>
        <div className="flex-shrink-0" style={{ width: 68 }} />
        <div className="text-[9px] font-bold text-[#7C1CFF] uppercase tracking-widest flex-1">
          Connected
        </div>
      </div>

      {/* The flow diagram */}
      <div className="flex items-center gap-0 overflow-x-auto">
        <HiBobNode monitor={hibob} onClick={() => openDialog(hibob)} readOnly={readOnly} />
        <FlowConnector active />
        <WorkatoNode monitor={workato} onClick={() => openDialog(workato)} readOnly={readOnly} />
        <FlowConnector active={connected.length > 0} />
        <ConnectedPanel monitors={connected} onAdd={() => openDialog(null)} onEdit={openDialog} readOnly={readOnly} />
      </div>

      {!readOnly && (
        <ConfigureIntegrationDialog
          projectId={projectId}
          clientId={clientId}
          integration={selected}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            setDialogOpen(false);
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
