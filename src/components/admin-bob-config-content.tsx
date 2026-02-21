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
  Play,
  AlertCircle,
  Eye,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: string;
}

interface BobConfigItem {
  id: string;
  title: string;
  description: string;
  loomUrl: string | null;
  faqItems: FaqItem[];
  completedAt: string | null;
}

interface BobConfigChecklist {
  id: string;
  projectId: string;
  items: BobConfigItem[];
  status: "active" | "in_review" | "approved";
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminBobConfigContentProps {
  projectId: string;
  projectName: string;
}

function StatusBadge({ status }: { status: BobConfigChecklist["status"] }) {
  const config = {
    active: { label: "In Progress", classes: "bg-violet-50 text-[#7C1CFF]", icon: Clock },
    in_review: { label: "Submitted — Awaiting Review", classes: "bg-amber-50 text-amber-700", icon: Eye },
    approved: { label: "Approved", classes: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  }[status];

  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        config.classes
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function AdminBobConfigContent({
  projectId,
  projectName,
}: AdminBobConfigContentProps) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<BobConfigChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/bob-config`);
      if (!res.ok) throw new Error("Failed to load checklist");
      const data = await res.json();
      setChecklist(data.checklist ?? null);
    } catch {
      toast.error("Failed to load HiBob configuration checklist");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/bob-config`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initialize checklist");
      }
      toast.success("HiBob configuration checklist created and client notified");
      await fetchChecklist();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInitializing(false);
    }
  };

  const handleReview = async (action: "approve" | "request_changes") => {
    setReviewing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/bob-config/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes: reviewNotes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }
      toast.success(
        action === "approve"
          ? "Configuration approved — client has been notified!"
          : "Changes requested — client has been notified"
      );
      setReviewNotes("");
      await fetchChecklist();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  // Not initialized (fetch complete but no checklist yet)
  if (!checklist) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-[#7C1CFF]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Initialize HiBob Configuration Checklist
              </h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                This will create the HiBob configuration checklist for {projectName}. The
                client will be notified to work through each item.
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
                Initialize Checklist
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = checklist.items.filter((i) => i.completedAt).length;
  const totalCount = checklist.items.length;

  return (
    <div className="space-y-5">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <StatusBadge status={checklist.status} />
        <p className="text-xs text-slate-400">
          {completedCount} / {totalCount} items completed by client
        </p>
      </div>

      {/* Review panel (only when in_review) */}
      {checklist.status === "in_review" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Ready for your review
            </p>
          </div>
          <p className="text-sm text-amber-700">
            The client has completed and submitted their HiBob configuration checklist.
            Review each item below, then approve or request changes.
          </p>
          <div>
            <label className="text-xs font-semibold text-amber-800 block mb-1.5">
              Review notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes for the client (e.g. what to update)..."
              rows={3}
              className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#7C1CFF]/30 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleReview("approve")}
              disabled={reviewing}
              className="rounded-full text-sm bg-emerald-600 hover:bg-emerald-700"
            >
              {reviewing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview("request_changes")}
              disabled={reviewing}
              className="rounded-full text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {reviewing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Request Changes
            </Button>
          </div>
        </div>
      )}

      {/* Approved banner */}
      {checklist.status === "approved" && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Configuration approved</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {checklist.approvedAt &&
                `Approved on ${new Date(checklist.approvedAt).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}.`}{" "}
              You can now advance this project to the Data Mapping stage.
            </p>
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-3">
        {checklist.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "border rounded-xl overflow-hidden",
              item.completedAt ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200 bg-white"
            )}
          >
            <button
              onClick={() =>
                setExpandedItem((prev) => (prev === item.id ? null : item.id))
              }
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    item.completedAt
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300"
                  )}
                >
                  {item.completedAt && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {item.title}
                  </p>
                  {item.completedAt && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Completed {new Date(item.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
              </div>
              {expandedItem === item.id ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {expandedItem === item.id && (
              <div className="border-t border-slate-100 px-5 py-4 bg-white space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                {item.faqItems && item.faqItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">FAQ</p>
                    {item.faqItems.map((faq, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">
                          {faq.question}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
