import { cn } from "@/lib/utils";

interface PhaseStatusBadgeProps {
  status: "pending" | "in_progress" | "completed" | "skipped";
  size?: "sm" | "md";
}

export function PhaseStatusBadge({ status, size = "sm" }: PhaseStatusBadgeProps) {
  const config = {
    pending: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      label: "Pending",
    },
    in_progress: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      label: "In Progress",
    },
    completed: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      label: "Completed",
    },
    skipped: {
      bg: "bg-slate-100",
      text: "text-slate-500",
      border: "border-slate-200",
      label: "Skipped",
    },
  };

  const { bg, text, border, label } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold border shadow-sm uppercase tracking-wider whitespace-nowrap",
        bg,
        text,
        border,
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs"
      )}
    >
      {label}
    </span>
  );
}
