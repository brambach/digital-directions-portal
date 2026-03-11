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
  integration?: any;
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

  const [serviceType, setServiceType] = useState(integration?.serviceType || "keypay");
  const [serviceName, setServiceName] = useState(integration?.serviceName || "");
  const [workatoApiToken, setWorkatoApiToken] = useState("");
  const [workatoEmail, setWorkatoEmail] = useState("");
  const [isEnabled, setIsEnabled] = useState(integration?.isEnabled !== false);
  const [alertEnabled, setAlertEnabled] = useState(integration?.alertEnabled !== false);

  useEffect(() => {
    if (integration) {
      setServiceType(integration.serviceType || "keypay");
      setServiceName(integration.serviceName || "");
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
      setAlertEnabled(integration.alertEnabled !== false);
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
        checkIntervalMinutes: 5,
        alertEnabled,
        alertChannels: JSON.stringify(["email", "in_app"]),
        alertThresholdMinutes: 5,
      };

      if (serviceType === "workato" && workatoApiToken && workatoEmail) {
        body.workatoCredentials = JSON.stringify({
          apiToken: workatoApiToken,
          email: workatoEmail,
        });
      }

      const url = integration ? `/api/integrations/${integration.id}` : "/api/integrations";
      const method = integration ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save integration");
      }

      toast.success(integration ? "Integration updated" : "Integration added");
      router.refresh();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save integration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{integration ? "Edit Connected System" : "Add Connected System"}</DialogTitle>
          <DialogDescription>
            Add a payroll or workforce system to this project&apos;s architecture view.
            HiBob and Workato are always included automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">System</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger id="serviceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keypay">KeyPay (Employment Hero)</SelectItem>
                <SelectItem value="myob">MYOB</SelectItem>
                <SelectItem value="deputy">Deputy</SelectItem>
                <SelectItem value="netsuite">NetSuite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="serviceName">Display Name</Label>
            <Input
              id="serviceName"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g., KeyPay Production"
              required
            />
          </div>

          {/* Workato Credentials */}
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

          {/* Enabled + Alerts */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isEnabled"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-700 rounded focus:ring-purple-600"
              />
              <Label htmlFor="isEnabled" className="cursor-pointer">Enable status monitoring</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="alertEnabled"
                checked={alertEnabled}
                onChange={(e) => setAlertEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-700 rounded focus:ring-purple-600"
              />
              <Label htmlFor="alertEnabled" className="cursor-pointer">Send alerts on status change</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : integration ? "Save Changes" : "Add System"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
