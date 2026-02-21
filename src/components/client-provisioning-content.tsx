"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoomEmbed } from "@/components/loom-embed";
import {
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Video,
  Info,
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

interface ClientProvisioningContentProps {
  projectId: string;
}

function parseDescription(description: string | null): StepDescription | null {
  if (!description) return null;
  try {
    return JSON.parse(description);
  } catch {
    return null;
  }
}

function LoomPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-slate-500">Video walkthrough coming soon</p>
      <p className="text-xs text-slate-400 mt-1">
        A step-by-step video guide for {title} provisioning will be available here.
      </p>
    </div>
  );
}

function StepCard({
  step,
  index,
  onMarkComplete,
  completing,
}: {
  step: ProvisioningStep;
  index: number;
  onMarkComplete: (stepId: string) => void;
  completing: string | null;
}) {
  const [showRevokeNote, setShowRevokeNote] = useState(false);
  const parsed = parseDescription(step.description);
  const isComplete = !!step.completedAt;
  const isVerified = !!step.verifiedAt;

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden",
        isVerified
          ? "border-emerald-200 bg-emerald-50/20"
          : isComplete
          ? "border-violet-200 bg-violet-50/10"
          : "border-slate-200 bg-white"
      )}
    >
      {/* Step header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                isVerified
                  ? "bg-emerald-100 text-emerald-700"
                  : isComplete
                  ? "bg-violet-100 text-[#7C1CFF]"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {isVerified ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVerified
                  ? "Verified by Digital Directions ✓"
                  : isComplete
                  ? "Completed — pending DD verification"
                  : "Not yet started"}
              </p>
            </div>
          </div>

          {isVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          )}
          {isComplete && !isVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-[#7C1CFF] shrink-0">
              <Clock className="w-3.5 h-3.5" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="px-6 py-5 space-y-5">
        {/* Loom video */}
        {step.loomUrl ? (
          <LoomEmbed url={step.loomUrl} title={`${step.title} provisioning walkthrough`} />
        ) : (
          <LoomPlaceholder title={step.title} />
        )}

        {/* Instructions */}
        {parsed && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">{parsed.intro}</p>

            <ol className="space-y-3">
              {parsed.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#7C1CFF] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{s}</span>
                </li>
              ))}
            </ol>

            {/* Revoke note — show after completion or on toggle */}
            {parsed.revokeNote && (
              <div>
                <button
                  onClick={() => setShowRevokeNote((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  {showRevokeNote ? "Hide" : "Show"} revoking access instructions
                  {showRevokeNote ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {showRevokeNote && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-600">{parsed.revokeNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Complete button */}
        {!isComplete && (
          <div className="pt-2">
            <Button
              onClick={() => onMarkComplete(step.id)}
              disabled={completing === step.id}
              className="rounded-full"
            >
              {completing === step.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Mark as Complete
            </Button>
            <p className="text-xs text-slate-400 mt-2">
              Only mark complete once you&apos;ve followed all steps above. If you made a mistake,
              contact your DD Integration Specialist.
            </p>
          </div>
        )}

        {isComplete && (
          <div className="pt-1 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Marked complete on{" "}
            {new Date(step.completedAt!).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientProvisioningContent({ projectId }: ClientProvisioningContentProps) {
  const [steps, setSteps] = useState<ProvisioningStep[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

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

  const handleMarkComplete = async (stepId: string) => {
    setCompleting(stepId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/provisioning/${stepId}/complete`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to mark step complete");
      }
      toast.success("Step marked as complete — your DD specialist will verify shortly.");
      await fetchSteps();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          Provisioning hasn&apos;t started yet
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Your DD Integration Specialist will set this up for you shortly.
        </p>
      </div>
    );
  }

  const verifiedCount = steps.filter((s) => s.verifiedAt).length;
  const allVerified = verifiedCount === steps.length;

  return (
    <div className="space-y-5">
      {/* Intro banner */}
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          The System Provisioning consists of granting administrative access to your Digital
          Directions Integration Specialist(s) on your HiBob,{" "}
          {steps.find((s) => s.stepKey === "keypay") ? "Employment Hero (KeyPay)," : ""} and
          Workato systems. The entire exercise should take less than 45 minutes.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-[#7C1CFF] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(verifiedCount / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 shrink-0">
          {verifiedCount} / {steps.length} verified
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            onMarkComplete={handleMarkComplete}
            completing={completing}
          />
        ))}
      </div>

      {/* All done banner */}
      {allVerified && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-emerald-800">Provisioning Complete!</p>
          <p className="text-xs text-emerald-600 mt-1">
            All systems have been provisioned and verified by Digital Directions. Your project
            will now move to the next stage.
          </p>
        </div>
      )}
    </div>
  );
}
