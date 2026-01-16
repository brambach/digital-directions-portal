import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, AlertCircle, Wrench } from "lucide-react";

interface PlatformStatusBadgeProps {
  status: "operational" | "degraded" | "major_outage" | "maintenance" | null;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function PlatformStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: PlatformStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="secondary" className={getSizeClass(size)}>
        {showIcon && <AlertCircle className={getIconSizeClass(size)} />}
        Unknown
      </Badge>
    );
  }

  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant as any}
      className={`${getSizeClass(size)} ${config.className}`}
    >
      {showIcon && <config.icon className={getIconSizeClass(size)} />}
      {config.label}
    </Badge>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "operational":
      return {
        label: "Operational",
        variant: "default",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      };
    case "degraded":
      return {
        label: "Degraded",
        variant: "warning",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: AlertTriangle,
      };
    case "major_outage":
      return {
        label: "Major Outage",
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      };
    case "maintenance":
      return {
        label: "Maintenance",
        variant: "secondary",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Wrench,
      };
    default:
      return {
        label: "Unknown",
        variant: "secondary",
        className: "bg-slate-100 text-slate-800 border-slate-200",
        icon: AlertCircle,
      };
  }
}

function getSizeClass(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "text-xs px-2 py-0.5 gap-1";
    case "md":
      return "text-sm px-2.5 py-1 gap-1.5";
    case "lg":
      return "text-base px-3 py-1.5 gap-2";
    default:
      return "text-sm px-2.5 py-1 gap-1.5";
  }
}

function getIconSizeClass(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "h-3 w-3";
    case "md":
      return "h-4 w-4";
    case "lg":
      return "h-5 w-5";
    default:
      return "h-4 w-4";
  }
}
