import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface IntegrationStatusBadgeProps {
  status: "healthy" | "degraded" | "down" | "unknown";
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function IntegrationStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: IntegrationStatusBadgeProps) {
  const config = {
    healthy: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
      label: "Healthy",
      icon: CheckCircle,
      iconColor: "text-emerald-500",
    },
    degraded: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
      label: "Degraded",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
    },
    down: {
      bg: "bg-rose-50",
      text: "text-rose-600",
      border: "border-rose-100",
      label: "Critical",
      icon: XCircle,
      iconColor: "text-rose-500",
    },
    unknown: {
      bg: "bg-gray-50",
      text: "text-gray-500",
      border: "border-gray-100",
      label: "Unknown",
      icon: HelpCircle,
      iconColor: "text-gray-400",
    },
  };

  const { bg, text, border, label, icon: Icon, iconColor } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-bold uppercase tracking-wider border",
        bg,
        text,
        border,
        size === "xs" && "px-1 py-0.5 text-[8px]",
        size === "sm" && "px-1.5 py-0.5 text-[9px]",
        size === "md" && "px-2 py-1 text-[10px]",
        size === "lg" && "px-3 py-1.5 text-xs"
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconColor,
            size === "xs" && "w-2 h-2",
            size === "sm" && "w-3 h-3",
            size === "md" && "w-3.5 h-3.5",
            size === "lg" && "w-4 h-4"
          )}
        />
      )}
      {label}
    </span>
  );
}
