"use client";

import { useState } from "react";
import { Activity, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationStatusBadge } from "@/components/integration-status-badge";
import { ConfigureIntegrationDialog } from "@/components/configure-integration-dialog";
import { formatDistanceToNow } from "date-fns";

interface IntegrationManagementSectionProps {
  projectId: string;
  clientId: string;
  integrations: any[];
}

export function IntegrationManagementSection({
  projectId,
  clientId,
  integrations,
}: IntegrationManagementSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);

  const handleAddNew = () => {
    setSelectedIntegration(null);
    setDialogOpen(true);
  };

  const handleEdit = (integration: any) => {
    setSelectedIntegration(integration);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    // Dialog will call router.refresh() which will reload the page data
    setDialogOpen(false);
    setSelectedIntegration(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
              Integrations
            </h2>
          </div>
          <p className="text-[10px] text-slate-500 ml-7">
            Status checked every 5 minutes automatically
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white h-8 px-3 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Integration
        </Button>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
        {integrations.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-slate-500 mb-4">No integrations configured</p>
            <p className="text-xs text-slate-400 mb-4">
              Monitor the health of HiBob, KeyPay, Workato, and other integrations.
            </p>
            <Button
              onClick={handleAddNew}
              size="sm"
              variant="outline"
              className="mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Integration
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors group"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    integration.currentStatus === "healthy"
                      ? "bg-emerald-50 text-emerald-600"
                      : integration.currentStatus === "degraded"
                      ? "bg-orange-50 text-orange-600"
                      : integration.currentStatus === "down"
                      ? "bg-red-50 text-red-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {integration.serviceName}
                      </h3>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">
                        {integration.serviceType}
                      </p>
                    </div>
                    <IntegrationStatusBadge
                      status={integration.currentStatus}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    {integration.lastCheckedAt && (
                      <p className="text-xs text-slate-400">
                        Checked{" "}
                        {formatDistanceToNow(new Date(integration.lastCheckedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    )}

                    {!integration.isEnabled && (
                      <span className="text-xs text-slate-400 italic">
                        (Monitoring disabled)
                      </span>
                    )}
                  </div>

                  {integration.lastErrorMessage && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-100 rounded px-2 py-1">
                      {integration.lastErrorMessage}
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleEdit(integration)}
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfigureIntegrationDialog
        projectId={projectId}
        clientId={clientId}
        integration={selectedIntegration}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
