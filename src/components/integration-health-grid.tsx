"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IntegrationHealthCard } from "./integration-health-card";
import { Activity } from "lucide-react";

interface Integration {
  id: string;
  serviceName: string;
  serviceType: string;
  currentStatus: "healthy" | "degraded" | "down" | "unknown";
  lastCheckedAt: string | null;
  lastErrorMessage: string | null;
  platformIncidents: string | null;
}

interface IntegrationHealthGridProps {
  clientId?: string;
  projectId?: string;
}

export function IntegrationHealthGrid({
  clientId,
  projectId,
}: IntegrationHealthGridProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
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

      <motion.div
        className={`grid ${gridCols} gap-4`}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {integrations.map((integration) => (
          <motion.div
            key={integration.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 28 } },
            }}
          >
            <IntegrationHealthCard integration={integration} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
