"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepDescription {
  intro: string;
  steps: string[];
  revokeNote: string;
}

interface ProvisioningStep {
  id: string;
  stepKey: string;
  title: string;
  description: string | null;
  loomUrl: string | null;
  orderIndex: number;
  completedAt: string | null;
  completedBy: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

interface AdminProvisioningContentProps {
  projectId: string;
  projectName: string;
}

function parseDescription(description: string | null): StepDescription | null {
  if (!description) return null;
  try {
    return JSON.parse(description);
  } catch {
    return null;
  }
}

function StepStatusBadge({ step }: { step: ProvisioningStep }) {
  if (step.verifiedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        Verified
      </span>
    );
  }
  if (step.completedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
        <Clock className="w-3 h-3" />
        Awaiting Verification
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
      <Clock className="w-3 h-3" />
      Not Started
    </span>
  );
}

function StepCard({
  step,
  onVerify,
  verifying,
}: {
  step: ProvisioningStep;
  onVerify: (stepId: string) => void;
  verifying: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseDescription(step.description);

  return (
    <div
      className={cn(
        "border rounded-xl overflow-hidden transition-all",
        step.verifiedAt
          ? "border-emerald-200 bg-emerald-50/30"
          : step.completedAt
          ? "border-amber-200 bg-amber-50/20"
          : "border-slate-200 bg-white"
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
              step.verifiedAt
                ? "bg-emerald-100 text-emerald-700"
                : step.completedAt
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {step.orderIndex}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{step.title}</p>
            {step.verifiedAt && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Verified {new Date(step.verifiedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
            )}
            {step.completedAt && !step.verifiedAt && (
              <p className="text-xs text-amber-600 mt-0.5">
                Completed by client on {new Date(step.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <StepStatusBadge step={step} />

          {step.completedAt && !step.verifiedAt && (
            <Button
              size="sm"
              onClick={() => onVerify(step.id)}
              disabled={verifying === step.id}
              className="rounded-full text-xs"
            >
              {verifying === step.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              )}
              Verify
            </Button>
          )}

          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && parsed && (
        <div className="border-t border-slate-100 px-5 py-4 bg-white space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{parsed.intro}</p>
          <ol className="space-y-2">
            {parsed.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-[#7C1CFF] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed whitespace-pre-line">{s}</span>
              </li>
            ))}
          </ol>
          {parsed.revokeNote && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 mb-1">Revoking Access (info only)</p>
              <p className="text-xs text-slate-600">{parsed.revokeNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminProvisioningContent({
  projectId,
  projectName,
}: AdminProvisioningContentProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<ProvisioningStep[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchSteps = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/provisioning`);
      if (!res.ok) throw new Error("Failed to load steps");
      const data = await res.json();
      setSteps(data.steps);
    } catch {
      toast.error("Failed to load provisioning steps");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/provisioning`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initialize provisioning");
      }
      toast.success("Provisioning steps created and client notified");
      await fetchSteps();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInitializing(false);
    }
  };

  const handleVerify = async (stepId: string) => {
    setVerifying(stepId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/provisioning/${stepId}/verify`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify step");
      }
      const data = await res.json();
      toast.success(
        data.allVerified
          ? "All steps verified — client has been notified!"
          : "Step verified"
      );
      await fetchSteps();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  // Not initialized yet
  if (!steps || steps.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-[#7C1CFF]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Initialize Provisioning
              </h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                This will create the standard provisioning checklist for the client — covering
                HiBob, {projectName.toLowerCase().includes("myob") ? "MYOB" : "Employment Hero (KeyPay)"}, and Workato.
                The client will be notified to begin.
              </p>
              <Button
                onClick={handleInitialize}
                disabled={initializing}
                className="rounded-full text-sm"
              >
                {initializing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Initialize Provisioning
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const verifiedCount = steps.filter((s) => s.verifiedAt).length;
  const completedCount = steps.filter((s) => s.completedAt && !s.verifiedAt).length;
  const allVerified = verifiedCount === steps.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-slate-500">
          {allVerified ? (
            <span className="text-emerald-600 font-semibold">All {steps.length} steps verified ✓</span>
          ) : (
            <>
              <span className="font-semibold text-slate-700">{verifiedCount}</span> of{" "}
              <span className="font-semibold text-slate-700">{steps.length}</span> steps verified
              {completedCount > 0 && (
                <span className="ml-2 text-amber-600">
                  · {completedCount} awaiting your verification
                </span>
              )}
            </>
          )}
        </p>
        {completedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" />
            Action needed
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            onVerify={handleVerify}
            verifying={verifying}
          />
        ))}
      </div>

      {allVerified && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Provisioning complete</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              All steps have been verified. The client has been notified and you can advance
              this project to the HiBob Configuration stage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
