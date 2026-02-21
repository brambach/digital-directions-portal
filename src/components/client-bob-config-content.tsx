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
  HelpCircle,
  Video,
  Send,
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
  createdAt: string;
  updatedAt: string;
}

interface ClientBobConfigContentProps {
  projectId: string;
}

function LoomPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <Video className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
      <p className="text-xs font-medium text-slate-500">Video guide coming soon</p>
      <p className="text-xs text-slate-400 mt-0.5">
        A walkthrough for &ldquo;{title}&rdquo; will be available here
      </p>
    </div>
  );
}

function FaqAccordion({ faqItems }: { faqItems: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqItems || faqItems.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <HelpCircle className="w-3.5 h-3.5" />
        Frequently Asked Questions
      </div>
      {faqItems.map((faq, i) => (
        <div
          key={i}
          className="border border-slate-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-medium text-slate-700">{faq.question}</span>
            {openIndex === i ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
          </button>
          {openIndex === i && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChecklistItem({
  item,
  isReadOnly,
  onToggle,
  toggling,
}: {
  item: BobConfigItem;
  isReadOnly: boolean;
  onToggle: (itemId: string, completed: boolean) => void;
  toggling: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = !!item.completedAt;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-all",
        isCompleted ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200 bg-white"
      )}
    >
      {/* Item header */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Checkbox */}
        <button
          onClick={() => !isReadOnly && onToggle(item.id, !isCompleted)}
          disabled={isReadOnly || toggling === item.id}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            isCompleted
              ? "border-emerald-500 bg-emerald-500"
              : "border-slate-300 hover:border-[#7C1CFF] cursor-pointer",
            (isReadOnly || toggling === item.id) && "cursor-default opacity-60"
          )}
        >
          {toggling === item.id ? (
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          ) : null}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-semibold",
              isCompleted ? "text-slate-500 line-through" : "text-slate-900"
            )}
          >
            {item.title}
          </p>
          {isCompleted && (
            <p className="text-xs text-emerald-600 mt-0.5">
              Completed{" "}
              {new Date(item.completedAt!).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
              })}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-white">
          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>

          {/* Loom video */}
          {item.loomUrl ? (
            <LoomEmbed url={item.loomUrl} title={item.title} />
          ) : (
            <LoomPlaceholder title={item.title} />
          )}

          {/* FAQ */}
          <FaqAccordion faqItems={item.faqItems} />
        </div>
      )}
    </div>
  );
}

export function ClientBobConfigContent({ projectId }: ClientBobConfigContentProps) {
  const [checklist, setChecklist] = useState<BobConfigChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const fetchChecklist = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/bob-config`);
      if (!res.ok) throw new Error("Failed to load checklist");
      const data = await res.json();
      setChecklist(data.checklist);
    } catch {
      toast.error("Failed to load HiBob configuration checklist");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const handleToggle = async (itemId: string, completed: boolean) => {
    if (!checklist) return;
    setToggling(itemId);
    try {
      const res = await fetch(`/api/projects/${projectId}/bob-config/item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, completed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update item");
      }
      const data = await res.json();
      setChecklist(data.checklist);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setToggling(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/bob-config/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit checklist");
      }
      const data = await res.json();
      setChecklist(data.checklist);
      setConfirmSubmit(false);
      toast.success("Checklist submitted for review. Your DD team will be in touch.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          HiBob configuration hasn&apos;t started yet
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Your DD Integration Specialist will set this up for you shortly.
        </p>
      </div>
    );
  }

  const completedCount = checklist.items.filter((i) => i.completedAt).length;
  const totalCount = checklist.items.length;
  const allCompleted = completedCount === totalCount;
  const isReadOnly = checklist.status === "in_review" || checklist.status === "approved";

  return (
    <div className="space-y-5">
      {/* Status banners */}
      {checklist.status === "in_review" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Submitted — awaiting review
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your Digital Directions team is reviewing your configuration. You&apos;ll be
              notified when complete.
            </p>
          </div>
        </div>
      )}

      {checklist.status === "approved" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              HiBob configuration approved!
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Your configuration has been reviewed and approved by Digital Directions.
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {checklist.status === "active" && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-[#7C1CFF] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 shrink-0">
            {completedCount} / {totalCount} complete
          </span>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-3">
        {checklist.items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            isReadOnly={isReadOnly}
            onToggle={handleToggle}
            toggling={toggling}
          />
        ))}
      </div>

      {/* Submit section */}
      {checklist.status === "active" && (
        <div className="pt-2">
          {!confirmSubmit ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {allCompleted
                  ? "All items complete — ready to submit for review."
                  : `${totalCount - completedCount} item(s) remaining before you can submit.`}
              </p>
              <Button
                onClick={() => setConfirmSubmit(true)}
                disabled={!allCompleted}
                className="rounded-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit for Review
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                Ready to submit?
              </p>
              <p className="text-sm text-slate-600">
                This will send your HiBob configuration to the Digital Directions team for
                review. Make sure all items are correctly configured before submitting.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-full"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Confirm & Submit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmSubmit(false)}
                  disabled={submitting}
                  className="rounded-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
