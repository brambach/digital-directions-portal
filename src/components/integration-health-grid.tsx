"use client";

import { useEffect, useState } from "react";
import { IntegrationHealthCard } from "./integration-health-card";
import { Activity } from "lucide-react";

interface IntegrationHealthGridProps {
  clientId?: string;
  projectId?: string;
}

export function IntegrationHealthGrid({
  clientId,
  projectId,
}: IntegrationHealthGridProps) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId]);

  const fetchIntegrations = async () => {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (clientId) params.append("clientId", clientId);

      const response = await fetch(`/api/integrations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card-elevated p-5">
        <div className="flex items-start gap-3 mb-4 animate-pulse">
          <div className="w-10 h-10 bg-slate-200 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-1/3" />
          </div>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-slate-200 rounded" />
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="card-elevated">
        <div className="empty-state py-8">
          <Activity className="empty-state-icon" />
          <h3 className="empty-state-title">No integrations configured</h3>
          <p className="empty-state-description">
            Contact your Digital Directions consultant to set up integration monitoring
          </p>
        </div>
      </div>
    );
  }

  // Determine grid columns based on number of integrations
  const gridCols = integrations.length === 1
    ? "grid-cols-1"
    : integrations.length === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

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

      <div className={`grid ${gridCols} gap-4`}>
        {integrations.map((integration) => (
          <IntegrationHealthCard
            key={integration.id}
            integration={integration}
          />
        ))}
      </div>
    </div>
  );
}
