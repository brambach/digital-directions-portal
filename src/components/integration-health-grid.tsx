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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">No integrations configured</p>
        <p className="text-sm text-slate-500 mt-2">
          Contact your Digital Directions consultant to set up integration monitoring
        </p>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
