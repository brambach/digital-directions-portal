"use client";

import { useEffect, useState } from "react";
import { IntegrationStatusBadge } from "./integration-status-badge";
import { Clock, Activity, TrendingUp, AlertCircle, Zap, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  serviceName: string;
  serviceType: string;
  currentStatus: "healthy" | "degraded" | "down" | "unknown";
  lastCheckedAt: string | null;
  lastErrorMessage: string | null;
  platformIncidents: string | null;
}

interface IntegrationHealthCardProps {
  integration: Integration;
}

export function IntegrationHealthCard({
  integration,
}: IntegrationHealthCardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.id]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/integrations/${integration.id}/metrics?timeRange=24h`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching integration metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    return <Zap className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-50 shadow-sm hover-card transition-all">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-transform",
              integration.currentStatus === "healthy"
                ? "bg-emerald-50 text-emerald-600"
                : integration.currentStatus === "degraded"
                  ? "bg-amber-50 text-amber-600"
                  : integration.currentStatus === "down"
                    ? "bg-red-50 text-red-600"
                    : "bg-slate-50 text-slate-400"
            )}
          >
            {getServiceIcon(integration.serviceType)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {integration.serviceName}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {integration.serviceType}
            </p>
          </div>
        </div>
        <IntegrationStatusBadge status={integration.currentStatus} size="sm" />
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-4 bg-gray-50 rounded-lg animate-pulse" />
          <div className="h-4 bg-gray-50 rounded-lg animate-pulse w-3/4" />
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Uptime (24h)</span>
              <div className={cn(
                "text-lg font-bold tracking-tight",
                metrics.uptimePercentage >= 99.5
                  ? "text-emerald-500"
                  : metrics.uptimePercentage >= 95
                    ? "text-amber-500"
                    : "text-red-500"
              )}>
                {metrics.uptimePercentage.toFixed(2)}%
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Latency</span>
              <div className="text-lg font-bold tracking-tight text-gray-900">
                {metrics.avgResponseTime}ms
              </div>
            </div>
          </div>

          {integration.lastCheckedAt && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-tight pt-4 border-t border-gray-50">
              <Clock className="w-3 h-3" />
              Synced {formatDistanceToNow(new Date(integration.lastCheckedAt), {
                addSuffix: true,
              })}
            </div>
          )}

          {integration.lastErrorMessage && (
            <div className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-2 uppercase tracking-tight">
              {integration.lastErrorMessage}
            </div>
          )}

          {/* Platform Incidents */}
          {integration.platformIncidents && (() => {
            try {
              const incidents = JSON.parse(integration.platformIncidents);
              return incidents.length > 0 ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-amber-500 mb-1 uppercase tracking-widest">
                        Active Incident
                      </p>
                      <p className="text-sm text-amber-900 font-semibold truncate">
                        {incidents[0].name}
                      </p>
                      <p className="text-[10px] text-amber-700 font-bold mt-1 uppercase tracking-tight">
                        {incidents[0].status} • {incidents[0].impact}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null;
            } catch (e) {
              return null;
            }
          })()}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Monitoring sync pending...</p>
      )}
    </div>
  );
}
