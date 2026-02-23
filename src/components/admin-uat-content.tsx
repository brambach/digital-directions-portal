"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  MinusCircle,
  ClipboardCheck,
  MessageSquare,
  RotateCcw,
  Check,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";

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

interface AvailableTemplate {
  id: string;
  name: string;
  payrollSystem: string;
  scenarios: string;
}

interface SerializedSignoff {
  id: string;
  signedByClient: string | null;
  signedAt: string | null;
  ddCounterSignedAt: string | null;
  createdAt: string;
}

interface AdminUatContentProps {
  projectId: string;
  uatResult: SerializedUatResult | null;
  template: SerializedTemplate | null;
  signoff: SerializedSignoff | null;
  availableTemplates: AvailableTemplate[];
}

const RESULT_CONFIG = {
  passed: { label: "Passed", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  failed: { label: "Failed", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  na: { label: "N/A", icon: MinusCircle, color: "text-slate-400", bg: "bg-slate-50" },
} as const;

const PAYROLL_LABELS: Record<string, string> = {
  keypay: "KeyPay",
  myob: "MYOB",
  deputy: "Deputy",
  generic: "Generic",
};

export function AdminUatContent({
  projectId,
  uatResult,
  template,
  signoff,
  availableTemplates,
}: AdminUatContentProps) {
  const router = useRouter();
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    availableTemplates[0]?.id ?? ""
  );
  const [publishing, setPublishing] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "request_changes" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [counterSigning, setCounterSigning] = useState(false);

  const scenarios: UatScenario[] = template ? JSON.parse(template.scenarios) : [];
  const results: Record<string, { result: string; notes: string }> = uatResult
    ? JSON.parse(uatResult.results)
    : {};

  // Preview scenarios for selected template in publish dialog
  const selectedTemplate = availableTemplates.find((t) => t.id === selectedTemplateId);
  const previewScenarios: UatScenario[] = selectedTemplate
    ? JSON.parse(selectedTemplate.scenarios)
    : [];

  const handlePublish = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/uat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish UAT");
      }
      toast.success("UAT published — client has been notified");
      setPublishDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleReview = async () => {
    if (!reviewAction) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/uat/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }
      toast.success(
        reviewAction === "approve"
          ? "UAT approved — client can now sign off"
          : "Changes requested — client has been notified"
      );
      setReviewDialogOpen(false);
      setReviewNotes("");
      setReviewAction(null);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCounterSign = async () => {
    if (!signoff) return;
    setCounterSigning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/signoffs/${signoff.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to counter-sign");
      }
      toast.success("UAT counter-signed — stage complete");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setCounterSigning(false);
    }
  };

  // No UAT results yet — show publish button + template picker dialog
  if (!uatResult) {
    return (
      <>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center space-y-4">
          <div className="py-4">
            <ClipboardCheck className="w-10 h-10 text-[#7C1CFF] mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">UAT Not Yet Published</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Choose a UAT template and publish the test scenarios to the client so they can
              begin testing the integration.
            </p>
          </div>
          <Button
            onClick={() => setPublishDialogOpen(true)}
            disabled={availableTemplates.length === 0}
            className="rounded-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Publish UAT to Client
          </Button>
          {availableTemplates.length === 0 && (
            <p className="text-xs text-amber-600">
              No UAT templates found. Seed the database or create a template first.
            </p>
          )}
        </div>

        {/* Template picker dialog */}
        <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#7C1CFF]" />
                Publish UAT
              </DialogTitle>
              <DialogDescription>
                Select a template for the UAT scenarios. The client will be notified to begin testing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                Select Template
              </p>
              {availableTemplates.map((t) => {
                const tScenarios: UatScenario[] = JSON.parse(t.scenarios);
                const isSelected = selectedTemplateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`w-full text-left border rounded-xl px-4 py-3 transition-all ${
                      isSelected
                        ? "border-[#7C1CFF] bg-violet-50 ring-2 ring-violet-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {PAYROLL_LABELS[t.payrollSystem] || t.payrollSystem} · {tScenarios.length} scenario{tScenarios.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#7C1CFF] flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Preview scenarios */}
            {previewScenarios.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                  Scenarios Preview
                </p>
                {previewScenarios.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-xs text-slate-600">
                    <FileText className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-700">{s.title}</span>
                      <span className="text-slate-400"> — {s.steps.length} steps</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPublishDialogOpen(false)} disabled={publishing}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={publishing || !selectedTemplateId}>
                {publishing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publish to Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Sign-off status banner
  const signoffBanner = () => {
    if (!signoff) return null;

    if (signoff.signedAt && signoff.ddCounterSignedAt) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">UAT Fully Signed Off</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Client signed {format(new Date(signoff.signedAt), "d MMM yyyy")}
              {" · "}Counter-signed {format(new Date(signoff.ddCounterSignedAt), "d MMM yyyy")}
            </p>
          </div>
        </div>
      );
    }

    if (signoff.signedAt) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Awaiting Counter-Sign</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Client signed on {format(new Date(signoff.signedAt), "d MMM yyyy")} — your counter-sign is needed
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleCounterSign}
            disabled={counterSigning}
            className="rounded-full"
          >
            {counterSigning ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Counter-Sign
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
          <ClipboardCheck className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-violet-800">Awaiting Client Sign-Off</p>
          <p className="text-xs text-violet-600 mt-0.5">
            UAT approved — waiting for client to sign off before Go-Live
          </p>
        </div>
      </div>
    );
  };

  const statusLabel = {
    active: "Active — Client Testing",
    in_review: "In Review — Awaiting Admin Review",
    approved: "Approved",
    complete: "Complete",
    locked: "Locked",
  }[uatResult.status] || uatResult.status;

  const statusBadge = {
    active: "bg-violet-50 text-[#7C1CFF]",
    in_review: "bg-amber-50 text-amber-600",
    approved: "bg-emerald-50 text-emerald-600",
    complete: "bg-emerald-50 text-emerald-600",
    locked: "bg-slate-100 text-slate-500",
  }[uatResult.status] || "bg-slate-100 text-slate-500";

  return (
    <>
      {signoffBanner()}

      {/* Status + scenario results */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">UAT Scenarios</h3>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>
            {statusLabel}
          </span>
        </div>

        {/* Scenario result rows */}
        <div className="space-y-3">
          {scenarios.map((scenario) => {
            const scenarioResult = results[scenario.id];
            const resultKey = scenarioResult?.result as keyof typeof RESULT_CONFIG | undefined;
            const config = resultKey && RESULT_CONFIG[resultKey];
            const ResultIcon = config?.icon;

            return (
              <div
                key={scenario.id}
                className="border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{scenario.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{scenario.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {config && ResultIcon ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
                      <ResultIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">Not tested</span>
                  )}
                </div>
              </div>
            );
          })}

          {scenarios.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No scenarios in template.</p>
          )}
        </div>

        {/* Client notes */}
        {Object.values(results).some((r) => r.notes) && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Client Notes</p>
            {scenarios.map((scenario) => {
              const scenarioResult = results[scenario.id];
              if (!scenarioResult?.notes) return null;
              return (
                <div key={scenario.id} className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-600">{scenario.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{scenarioResult.notes}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Review actions for in_review status */}
        {uatResult.status === "in_review" && (
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                setReviewAction("request_changes");
                setReviewDialogOpen(true);
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Request Changes
            </Button>
            <Button
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                setReviewAction("approve");
                setReviewDialogOpen(true);
              }}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Approve UAT
            </Button>
          </div>
        )}
      </div>

      {/* Review dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve UAT Results" : "Request Changes"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "Approve the client's UAT results. This will create a sign-off for the client to confirm."
                : "Request changes to the client's UAT results. They will be able to re-test and resubmit."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
              Review Notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                reviewAction === "approve"
                  ? "Any notes for the client about the approval..."
                  : "Describe what needs to change..."
              }
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-[#7C1CFF] resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setReviewNotes("");
                setReviewAction(null);
              }}
              disabled={submittingReview}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={submittingReview}
              variant={reviewAction === "request_changes" ? "outline" : "default"}
            >
              {submittingReview ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : reviewAction === "approve" ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {reviewAction === "approve" ? "Approve" : "Request Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
