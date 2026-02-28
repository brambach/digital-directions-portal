"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ConfigureIntegrationDialogProps {
  projectId: string;
  clientId: string;
  integration?: any; // If editing existing integration
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConfigureIntegrationDialog({
  projectId,
  clientId,
  integration,
  open,
  onOpenChange,
  onSuccess,
}: ConfigureIntegrationDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [serviceType, setServiceType] = useState(
    integration?.serviceType || "hibob"
  );
  const [serviceName, setServiceName] = useState(
    integration?.serviceName || ""
  );
  const [workatoApiToken, setWorkatoApiToken] = useState("");
  const [workatoEmail, setWorkatoEmail] = useState("");
  const [isEnabled, setIsEnabled] = useState(
    integration?.isEnabled !== false
  );
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(
    integration?.checkIntervalMinutes?.toString() || "5"
  );
  const [alertEnabled, setAlertEnabled] = useState(
    integration?.alertEnabled !== false
  );
  const [alertThresholdMinutes, setAlertThresholdMinutes] = useState(
    integration?.alertThresholdMinutes?.toString() || "15"
  );

  useEffect(() => {
    if (integration) {
      setServiceType(integration.serviceType || "hibob");
      setServiceName(integration.serviceName || "");

      // Parse Workato credentials if editing
      if (integration.workatoCredentials) {
        try {
          const creds = JSON.parse(integration.workatoCredentials);
          setWorkatoApiToken(creds.apiToken || "");
          setWorkatoEmail(creds.email || "");
        } catch (e) {
          console.warn("Failed to parse Workato credentials");
        }
      }

      setIsEnabled(integration.isEnabled !== false);
      setCheckIntervalMinutes(integration.checkIntervalMinutes?.toString() || "5");
      setAlertEnabled(integration.alertEnabled !== false);
      setAlertThresholdMinutes(integration.alertThresholdMinutes?.toString() || "15");
    }
  }, [integration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body: any = {
        projectId,
        clientId,
        serviceType,
        serviceName: serviceName.trim(),
        isEnabled,
        checkIntervalMinutes: parseInt(checkIntervalMinutes) || 5,
        alertEnabled,
        alertChannels: JSON.stringify(["email", "in_app"]),
        alertThresholdMinutes: parseInt(alertThresholdMinutes) || 15,
      };

      // Only add Workato credentials if it's a Workato integration
      if (serviceType === "workato" && workatoApiToken && workatoEmail) {
        body.workatoCredentials = JSON.stringify({
          apiToken: workatoApiToken,
          email: workatoEmail,
        });
      }

      const url = integration
        ? `/api/integrations/${integration.id}`
        : "/api/integrations";
      const method = integration ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save integration");
      }

      toast.success(
        integration
          ? "Integration updated successfully"
          : "Integration created successfully"
      );

      router.refresh();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving integration:", error);
      toast.error(error.message || "Failed to save integration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {integration ? "Edit Integration" : "Add Integration"}
          </DialogTitle>
          <DialogDescription>
            Configure integration monitoring for this client. Status page monitoring tracks platform health without requiring credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger id="serviceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hibob">HiBob (Status Page Only)</SelectItem>
                <SelectItem value="keypay">KeyPay (Status Page Only)</SelectItem>
                <SelectItem value="workato">Workato (Status + Recipe List)</SelectItem>
                <SelectItem value="netsuite">NetSuite (Status Page Only)</SelectItem>
                <SelectItem value="deputy">Deputy (Status Page Only)</SelectItem>
                <SelectItem value="myob">MYOB (Status Page Only)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {serviceType === "workato"
                ? "Monitors Workato status page and basic recipe list (running/stopped counts)"
                : "Monitors platform status page for service availability"}
            </p>
          </div>

          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="serviceName">Service Name</Label>
            <Input
              id="serviceName"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g., HiBob Production"
              required
            />
          </div>

          {/* Workato Credentials (only shown for Workato) */}
          {serviceType === "workato" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="workatoApiToken">Workato API Token</Label>
                <Input
                  id="workatoApiToken"
                  type="password"
                  value={workatoApiToken}
                  onChange={(e) => setWorkatoApiToken(e.target.value)}
                  placeholder="Enter your Workato API token"
                />
                <p className="text-xs text-slate-500">
                  Used to fetch basic recipe list (running/stopped status)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workatoEmail">Workato Email</Label>
                <Input
                  id="workatoEmail"
                  type="email"
                  value={workatoEmail}
                  onChange={(e) => setWorkatoEmail(e.target.value)}
                  placeholder="your-email@company.com"
                />
              </div>
            </>
          )}

          {/* Check Interval */}
          <div className="space-y-2">
            <Label htmlFor="checkInterval">Check Interval (Minutes)</Label>
            <Input
              id="checkInterval"
              type="number"
              min="1"
              max="1440"
              value={checkIntervalMinutes}
              onChange={(e) => setCheckIntervalMinutes(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              How often to check status page (1-1440 minutes, recommended: 5-10)
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isEnabled"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 text-purple-700 rounded focus:ring-purple-600"
            />
            <Label htmlFor="isEnabled" className="cursor-pointer">
              Enable monitoring for this integration
            </Label>
          </div>

          {/* Alert Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-slate-900">Alert Settings</h3>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="alertEnabled"
                checked={alertEnabled}
                onChange={(e) => setAlertEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-700 rounded focus:ring-purple-600"
              />
              <Label htmlFor="alertEnabled" className="cursor-pointer">
                Enable alerts for this integration
              </Label>
            </div>

            {alertEnabled && (
              <div className="space-y-2 pl-7">
                <Label htmlFor="alertThreshold">Alert Threshold (Minutes)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  min="1"
                  max="60"
                  value={alertThresholdMinutes}
                  onChange={(e) => setAlertThresholdMinutes(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Send alert if integration is down for more than this many minutes
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : integration ? (
                "Update Integration"
              ) : (
                "Add Integration"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
