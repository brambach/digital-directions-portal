"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  Send,
  ExternalLink,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigiMascot } from "@/components/digi-mascot";
import { UatSignoffBanner } from "@/components/uat-signoff-banner";

interface UatScenario {
  id: string;
  title: string;
  description: string;
  loomUrl?: string;
  steps: string[];
}

interface SerializedUatResult {
  id: string;
  projectId: string;
  templateId: string;
  results: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SerializedTemplate {
  id: string;
  payrollSystem: string;
  name: string;
  scenarios: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface SerializedSignoff {
  id: string;
  signedByClient: string | null;
  signedAt: string | null;
  ddCounterSignedAt: string | null;
  documentSnapshot: string | null;
  clientConfirmText?: string | null;
  createdAt: string;
}

interface ClientUatContentProps {
  projectId: string;
  uatResult: SerializedUatResult | null;
  template: SerializedTemplate | null;
  signoff: SerializedSignoff | null;
}

type ResultValue = "passed" | "failed" | "na";

const RESULT_OPTIONS: { value: ResultValue; label: string; icon: typeof CheckCircle; color: string; bg: string; ring: string }[] = [
  { value: "passed", label: "Passed", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", ring: "ring-emerald-200" },
  { value: "failed", label: "Failed", icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", ring: "ring-red-200" },
  { value: "na", label: "N/A", icon: MinusCircle, color: "text-slate-400", bg: "bg-slate-50 border-slate-200", ring: "ring-slate-200" },
];

export function ClientUatContent({
  projectId,
  uatResult,
  template,
  signoff,
}: ClientUatContentProps) {
  const router = useRouter();
  const scenarios: UatScenario[] = template ? JSON.parse(template.scenarios) : [];

  // Parse existing results
  const existingResults: Record<string, { result: ResultValue; notes: string }> = uatResult
    ? JSON.parse(uatResult.results)
    : {};

  const [results, setResults] = useState<Record<string, { result: ResultValue | null; notes: string }>>(
    () => {
      const initial: Record<string, { result: ResultValue | null; notes: string }> = {};
      for (const s of scenarios) {
        initial[s.id] = {
          result: (existingResults[s.id]?.result as ResultValue) ?? null,
          notes: existingResults[s.id]?.notes ?? "",
        };
      }
      return initial;
    }
  );
  const [submitting, setSubmitting] = useState(false);

  const allSelected = scenarios.every((s) => results[s.id]?.result !== null);
  const isReadOnly = uatResult?.status === "in_review" || uatResult?.status === "approved" || uatResult?.status === "complete";
  const isFullySigned = !!signoff?.signedAt && !!signoff?.ddCounterSignedAt;

  const handleResultChange = (scenarioId: string, value: ResultValue) => {
    setResults((prev) => ({
      ...prev,
      [scenarioId]: { ...prev[scenarioId], result: value },
    }));
  };

  const handleNotesChange = (scenarioId: string, notes: string) => {
    setResults((prev) => ({
      ...prev,
      [scenarioId]: { ...prev[scenarioId], notes },
    }));
  };

  const handleSubmit = async () => {
    if (!allSelected) {
      toast.error("Please select a result for all scenarios");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/uat/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit results");
      }
      toast.success("UAT results submitted for review");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // No UAT published yet
  if (!uatResult) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-5">
          <DigiMascot variant="sleeping" className="w-20 md:w-24 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-snug text-slate-800">
              UAT not yet available
            </h3>
            <p className="text-sm mt-1 leading-relaxed text-slate-500">
              The Digital Directions team is preparing your test scenarios. You&apos;ll be
              notified when UAT testing is ready to begin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fully signed off — celebration
  if (isFullySigned) {
    return (
      <>
        <UatSignoffBanner projectId={projectId} signoff={signoff!} />
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-5 px-6 py-5">
            <DigiMascot variant="celebrating" className="w-20 md:w-24 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base leading-snug text-emerald-800">
                UAT Complete!
              </h3>
              <p className="text-sm mt-1 leading-relaxed text-emerald-700">
                All test scenarios have been verified and signed off. Your integration is
                approved and ready for Go-Live.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-500">
                <PartyPopper className="w-3.5 h-3.5 flex-shrink-0" />
                Go-Live is the next step
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Approved — show signoff banner
  if (uatResult.status === "approved" && signoff && !signoff.signedAt) {
    return (
      <>
        <UatSignoffBanner projectId={projectId} signoff={signoff} />
        <DigiHeader variant="celebrating" headline="All tests approved!" subtext="Please sign off below to proceed to Go-Live." />
        <ScenarioList scenarios={scenarios} results={results} isReadOnly={true} />
      </>
    );
  }

  // Already signed — waiting for counter-sign
  if (signoff?.signedAt && !signoff.ddCounterSignedAt) {
    return (
      <>
        <UatSignoffBanner projectId={projectId} signoff={signoff} />
        <DigiHeader variant="neutral" headline="Awaiting counter-sign" subtext="The Digital Directions team will counter-sign your UAT shortly." />
        <ScenarioList scenarios={scenarios} results={results} isReadOnly={true} />
      </>
    );
  }

  // In review — read only
  if (uatResult.status === "in_review") {
    return (
      <>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Results Under Review</p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your test results. You&apos;ll be notified once they&apos;re approved.
            </p>
          </div>
        </div>
        <DigiHeader variant="neutral" headline="Results submitted" subtext="Sit tight — our team is reviewing your test results." />
        <ScenarioList scenarios={scenarios} results={results} isReadOnly={true} />
      </>
    );
  }

  // Active — testing in progress
  return (
    <>
      <DigiHeader
        variant="construction"
        headline="Test your integration"
        subtext="Work through each scenario below using your real data. Select a result for each one, add any notes, then submit."
      />

      {/* Scenario cards */}
      <div className="space-y-4">
        {scenarios.map((scenario, idx) => {
          const scenarioResult = results[scenario.id];
          return (
            <div
              key={scenario.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#7C1CFF]">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800">{scenario.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{scenario.description}</p>
                </div>
              </div>

              {/* Loom video link */}
              {scenario.loomUrl && (
                <a
                  href={scenario.loomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C1CFF] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Watch walkthrough video
                </a>
              )}

              {/* Steps */}
              {scenario.steps.length > 0 && (
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">
                    Steps
                  </p>
                  <ol className="space-y-1.5">
                    {scenario.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-semibold text-slate-400">
                          {stepIdx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Result selector */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">
                  Result
                </p>
                <div className="flex gap-2">
                  {RESULT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = scenarioResult?.result === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => !isReadOnly && handleResultChange(scenario.id, opt.value)}
                        disabled={isReadOnly}
                        className={`
                          flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all
                          ${isSelected
                            ? `${opt.bg} ${opt.color} ring-2 ${opt.ring}`
                            : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500"
                          }
                          ${isReadOnly ? "cursor-default opacity-75" : "cursor-pointer"}
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1.5 block">
                  Notes (optional)
                </label>
                <textarea
                  value={scenarioResult?.notes ?? ""}
                  onChange={(e) => !isReadOnly && handleNotesChange(scenario.id, e.target.value)}
                  placeholder="Any observations, issues, or comments about this test..."
                  rows={2}
                  disabled={isReadOnly}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-[#7C1CFF] resize-none disabled:opacity-75 disabled:cursor-default"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!isReadOnly && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !allSelected}
            className="rounded-full"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Results for Review
          </Button>
        </div>
      )}
    </>
  );
}

// Shared Digi header card
function DigiHeader({
  variant,
  headline,
  subtext,
}: {
  variant: "construction" | "celebrating" | "neutral" | "sleeping";
  headline: string;
  subtext: string;
}) {
  const isGreen = variant === "celebrating";
  return (
    <div
      className={
        isGreen
          ? "bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm overflow-hidden"
          : "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      }
    >
      <div className="flex items-center gap-5 px-6 py-5">
        <DigiMascot
          variant={variant}
          className="w-20 md:w-24 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3
            className={
              "font-bold text-base leading-snug " +
              (isGreen ? "text-emerald-800" : "text-slate-800")
            }
          >
            {headline}
          </h3>
          <p
            className={
              "text-sm mt-1 leading-relaxed " +
              (isGreen ? "text-emerald-700" : "text-slate-500")
            }
          >
            {subtext}
          </p>
        </div>
      </div>
    </div>
  );
}

// Read-only scenario list for review/signed states
function ScenarioList({
  scenarios,
  results,
  isReadOnly,
}: {
  scenarios: UatScenario[];
  results: Record<string, { result: ResultValue | null; notes: string }>;
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      {scenarios.map((scenario) => {
        const scenarioResult = results[scenario.id];
        const resultKey = scenarioResult?.result;
        const opt = RESULT_OPTIONS.find((o) => o.value === resultKey);
        const Icon = opt?.icon;

        return (
          <div
            key={scenario.id}
            className="border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{scenario.title}</p>
              {scenarioResult?.notes && (
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{scenarioResult.notes}</p>
              )}
            </div>
            {opt && Icon ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${opt.bg} ${opt.color}`}>
                <Icon className="w-3 h-3" />
                {opt.label}
              </span>
            ) : (
              <span className="text-xs text-slate-300">Not tested</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
