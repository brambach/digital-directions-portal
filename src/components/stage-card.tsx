"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DijiMascot } from "@/components/diji-mascot";
import {
  Check,
  ChevronRight,
  Lock,
  Loader2,
  Clock,
  Eye,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { stageLabel } from "@/lib/lifecycle";

export type StageStatus = "locked" | "active" | "in_review" | "approved" | "complete";

interface StageCardProps {
  stage: string;
  status: StageStatus;
  title: string;
  description: string;
  isAdmin: boolean;
  projectId: string;
  backHref: string;
  onAdvance?: () => void;
  onLock?: () => void;
  children?: React.ReactNode;
}

const STATUS_CONFIG: Record<
  StageStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  locked: {
    label: "Stage Locked",
    badgeClass: "bg-slate-100 text-slate-500",
    icon: Lock,
  },
  active: {
    label: "In Progress",
    badgeClass: "bg-violet-50 text-[#7C1CFF]",
    icon: Clock,
  },
  in_review: {
    label: "Awaiting Review",
    badgeClass: "bg-amber-50 text-amber-600",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-emerald-50 text-emerald-600",
    icon: Check,
  },
  complete: {
    label: "Complete",
    badgeClass: "bg-emerald-50 text-emerald-600",
    icon: Check,
  },
};

export function StageCard({
  stage,
  status,
  title,
  description,
  isAdmin,
  projectId,
  backHref,
  onAdvance,
  onLock,
  children,
}: StageCardProps) {
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);
  const [locking, setLocking] = useState(false);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to advance stage");
      }
      toast.success("Stage advanced");
      router.refresh();
      onAdvance?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdvancing(false);
    }
  };

  const handleLock = async () => {
    setLocking(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to lock stage");
      }
      toast.success("Stage rolled back");
      router.refresh();
      onLock?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-700 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-slate-400 font-semibold text-sm">/ {title}</span>
      </div>

      {/* Card */}
      <div
        className={cn(
          "bg-white rounded-2xl border shadow-sm overflow-hidden",
          status === "locked" ? "border-slate-200 opacity-75" : "border-slate-100"
        )}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                config.badgeClass
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
          </div>

          {/* Admin controls */}
          {isAdmin && status !== "locked" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLock}
                disabled={locking || advancing}
                className="rounded-full text-xs"
              >
                {locking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                )}
                Lock Stage
              </Button>
              <Button
                size="sm"
                onClick={handleAdvance}
                disabled={advancing || locking}
                className="rounded-full text-xs"
              >
                {advancing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 mr-1.5" />
                )}
                Advance Stage
              </Button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {status === "locked" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DijiMascot variant="sleeping" size="sm" className="mb-4" />
              <h3 className="text-base font-bold text-slate-600 mb-1">
                Stage Locked
              </h3>
              <p className="text-sm text-slate-400 max-w-sm">
                This stage will unlock when the previous stages are completed.
                Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{description}</p>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
