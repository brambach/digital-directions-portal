"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { IntegrationFlowDiagram } from "./integration-flow-diagram";

interface Integration {
  id: string;
  serviceName: string;
  serviceType: string;
  currentStatus: string | null;
  isEnabled: boolean;
  lastCheckedAt: string | null;
  lastErrorMessage: string | null;
}

interface ClientIntegrationFlowProps {
  clientId: string;
  projectId: string;
}

export function ClientIntegrationFlow({ clientId, projectId }: ClientIntegrationFlowProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (projectId) params.append("projectId", projectId);
    if (clientId) params.append("clientId", clientId);

    fetch(`/api/integrations?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setIntegrations(data))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false));
  }, [clientId, projectId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-[132px] h-[140px] bg-slate-100 rounded-2xl" />
          <div className="w-[68px] h-px bg-slate-100" />
          <div className="w-[148px] h-[140px] bg-slate-100 rounded-2xl" />
          <div className="w-[68px] h-px bg-slate-100" />
          <div className="flex-1 h-[140px] bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-gray-900 font-bold text-base mb-2">All Systems Healthy</h3>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          No integration monitoring has been configured yet. Your team will set this up when needed.
        </p>
      </div>
    );
  }

  // Map string dates to Date objects for the flow diagram
  const mapped = integrations.map((i) => ({
    ...i,
    lastCheckedAt: i.lastCheckedAt ? new Date(i.lastCheckedAt) : null,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Status automatically checked every 5 minutes
        </p>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5" />
          Live monitoring
        </span>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <IntegrationFlowDiagram
          projectId={projectId}
          clientId={clientId}
          integrations={mapped}
          readOnly
        />
      </div>
    </div>
  );
}
