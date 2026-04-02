"use client";

import { useState } from "react";
import { Plus, Settings, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

const PAYROLL_META: Record<string, { name: string; role: string; abbr: string; from: string; to: string; logo: string }> = {
  keypay:   { name: "KeyPay",   role: "Payroll",              abbr: "KP", from: "#3B82F6", to: "#1D4ED8", logo: "/images/logos/keypay-icon.jpg" },
  myob:     { name: "MYOB",     role: "Payroll & Accounting", abbr: "MB", from: "#8B5CF6", to: "#6D28D9", logo: "/images/logos/myob-icon.png"   },
  deputy:   { name: "Deputy",   role: "Workforce Mgmt",       abbr: "DP", from: "#10B981", to: "#047857", logo: "/images/logos/deputy-icon.png"  },
  netsuite: { name: "NetSuite", role: "ERP & Payroll",        abbr: "NS", from: "#60A5FA", to: "#1D4ED8", logo: "/images/logos/netsuite-icon.svg"},
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

function StatusIndicator({ status, lastCheckedAt, serviceType }: { status: string | null; lastCheckedAt: Date | null; serviceType?: string }) {
  const s = statusColor(status);
  const isMYOBUnknown = serviceType === "myob" && (!status || status === "unknown");
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
        {isMYOBUnknown ? (
          <a href="https://status.myob.com" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-slate-400 hover:text-violet-600 tracking-wider">
            Check →
          </a>
        ) : s.label ? (
          <span className={cn("text-[9px] font-bold tracking-wider", s.labelColor)}>{s.label}</span>
        ) : null}
      </div>
      {!isMYOBUnknown && lastCheckedAt && (
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
      <div
        className={cn(
          "absolute left-0 right-3 top-1/2 -translate-y-1/2 h-px",
          active
            ? "bg-gradient-to-r from-violet-200 via-violet-400 to-violet-300"
            : "bg-slate-200"
        )}
      />
      {active && (
        <div
          className="absolute left-0 right-3 top-1/2 -translate-y-1/2 h-px animate-connector-shimmer"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(124,28,255,0.35) 50%, transparent 100%)",
            backgroundSize: "50% 100%",
          }}
        />
      )}
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
        !readOnly && "hover:border-rose-200 hover:shadow-md cursor-pointer"
      )}
      style={{ width: 132 }}
    >
      {!readOnly && (
        <Settings className="absolute top-3 left-3 w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
        <img src="/images/logos/hibob-icon.jpg" alt="HiBob" className="w-full h-full object-cover" />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-bold text-slate-800 leading-tight">HiBob</p>
        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">HRIS</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Source of Truth</p>
      </div>
      <div className="pt-1 border-t border-slate-100 w-full flex justify-center">
        <StatusIndicator status={monitor?.currentStatus ?? null} lastCheckedAt={monitor?.lastCheckedAt ?? null} serviceType={monitor?.serviceType} />
      </div>
    </Tag>
  );
}

// ─── Workato node with subtle ambient glow ───────────────────────────────────

function WorkatoNode({ monitor, onClick, readOnly }: { monitor: Monitor | null; onClick: () => void; readOnly?: boolean }) {
  const Tag = readOnly ? "div" : "button";
  return (
    <Tag
      {...(!readOnly && { onClick })}
      className={cn(
        "group relative flex flex-col items-center gap-2 py-4 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all flex-shrink-0",
        !readOnly && "hover:shadow-md hover:border-orange-200 cursor-pointer"
      )}
      style={{ width: 148 }}
    >
      {!readOnly && (
        <Settings className="absolute top-3 left-3 w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <div className="w-12 h-12 flex items-center justify-center overflow-hidden p-1">
        <img src="/images/logos/workato-icon.png" alt="Workato" className="w-full h-full object-contain" />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-bold text-slate-800 leading-tight">Workato</p>
        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mt-0.5">Middleware</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Integration Hub</p>
      </div>
      <div className="pt-1 border-t border-slate-100 w-full flex justify-center">
        <StatusIndicator status={monitor?.currentStatus ?? null} lastCheckedAt={monitor?.lastCheckedAt ?? null} serviceType={monitor?.serviceType} />
      </div>
    </Tag>
  );
}

// ─── Connected system node (matches HiBob/Workato card style) ────────────────

function ConnectedNode({ monitor, onClick, readOnly }: { monitor: Monitor; onClick: () => void; readOnly?: boolean }) {
  const meta = PAYROLL_META[monitor.serviceType] ?? {
    name: monitor.serviceName,
    role: "Connected System",
    abbr: monitor.serviceName.slice(0, 2).toUpperCase(),
    from: "#64748B",
    to: "#475569",
    logo: "",
  };

  const Tag = readOnly ? "div" : "button";
  return (
    <Tag
      {...(!readOnly && { onClick })}
      className={cn(
        "group relative flex flex-col items-center gap-2 py-4 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all flex-shrink-0",
        !readOnly && "cursor-pointer hover:border-slate-200 hover:shadow-md"
      )}
      style={{ width: 132 }}
    >
      {!readOnly && (
        <Settings className="absolute top-3 left-3 w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
        {meta.logo
          ? <img src={meta.logo} alt={meta.name} className="w-full h-full object-cover" />
          : <span className="text-sm font-black text-white w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}>{meta.abbr}</span>
        }
      </div>
      <div className="text-center">
        <p className="text-[13px] font-bold text-slate-800 leading-tight">{meta.name}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: meta.from }}>{meta.role}</p>
      </div>
      <div className="pt-1 border-t border-slate-100 w-full flex justify-center">
        <StatusIndicator status={monitor.currentStatus} lastCheckedAt={monitor.lastCheckedAt} serviceType={monitor.serviceType} />
      </div>
    </Tag>
  );
}

// ─── Dashed add node ─────────────────────────────────────────────────────────

function AddSystemNode({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 py-4 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-transparent hover:border-[#7C1CFF] hover:bg-violet-50/40 transition-all flex-shrink-0"
      style={{ width: 132 }}
    >
      <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 group-hover:border-[#7C1CFF] flex items-center justify-center transition-colors">
        <Plus className="w-5 h-5 text-slate-300 group-hover:text-[#7C1CFF] transition-colors" />
      </div>
      <p className="text-[11px] font-semibold text-slate-400 group-hover:text-[#7C1CFF] transition-colors">Add System</p>
    </button>
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

  const showConnected = connected.length > 0 || !readOnly;

  return (
    <>
      {/* Zone labels */}
      <div className="flex items-end gap-0 mb-3">
        <div className="text-[9px] font-bold text-rose-400 uppercase tracking-widest text-center flex-shrink-0" style={{ width: 132 }}>
          HRIS
        </div>
        <div className="flex-shrink-0" style={{ width: 68 }} />
        <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest text-center flex-shrink-0" style={{ width: 148 }}>
          Middleware
        </div>
        <div className="flex-shrink-0" style={{ width: 68 }} />
        <div className="text-[9px] font-bold text-[#7C1CFF] uppercase tracking-widest">
          Connected
        </div>
      </div>

      {/* The flow diagram */}
      <div className="flex items-center gap-0 overflow-x-auto">
        <HiBobNode monitor={hibob} onClick={() => openDialog(hibob)} readOnly={readOnly} />
        <FlowConnector active />
        <WorkatoNode monitor={workato} onClick={() => openDialog(workato)} readOnly={readOnly} />

        {showConnected && (
          <>
            <FlowConnector active={connected.length > 0} />
            <div className="flex items-center gap-3">
              {connected.map((m) => (
                <ConnectedNode key={m.id} monitor={m} onClick={() => openDialog(m)} readOnly={readOnly} />
              ))}
              {!readOnly && <AddSystemNode onClick={() => openDialog(null)} />}
            </div>
          </>
        )}
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
