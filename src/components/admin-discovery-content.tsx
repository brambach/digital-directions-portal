"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoomEmbed } from "@/components/loom-embed";
import { DijiMascot } from "@/components/diji-mascot";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  Loader2,
  Send,
  RotateCcw,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface Section {
  id: string;
  title: string;
  description?: string;
  loomUrl?: string;
  questions: Question[];
}

interface Template {
  id: string;
  name: string;
  payrollSystem: string;
  sections: Section[];
}

interface DiscoveryResponse {
  id: string;
  projectId: string;
  templateId: string;
  responses: Record<string, string | boolean>;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
  payrollSystem: string;
  questionCount: number;
  sections: Section[];
}

interface AdminDiscoveryContentProps {
  projectId: string;
  projectName: string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ElementType }> = {
  active: { label: "In Progress", badgeClass: "bg-violet-50 text-[#7C1CFF]", icon: Clock },
  in_review: { label: "Awaiting Review", badgeClass: "bg-amber-50 text-amber-600", icon: Eye },
  approved: { label: "Approved", badgeClass: "bg-emerald-50 text-emerald-600", icon: Check },
};

export function AdminDiscoveryContent({ projectId, projectName }: AdminDiscoveryContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<DiscoveryResponse | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchDiscovery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/discovery`);
      if (res.ok) {
        const data = await res.json();
        setResponse(data.response);
        setTemplate(data.template);
        if (data.response?.reviewNotes) {
          setReviewNotes(data.response.reviewNotes);
        }
        // Expand all sections by default
        if (data.template?.sections) {
          setExpandedSections(new Set(data.template.sections.map((s: Section) => s.id)));
        }
      }

      // Fetch available templates for the "start discovery" view
      const templatesRes = await fetch("/api/discovery-templates");
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error("Error fetching discovery:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDiscovery();
  }, [fetchDiscovery]);

  const handleStart = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }
    setStarting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start discovery");
      }
      toast.success("Discovery started — client has been notified");
      router.refresh();
      fetchDiscovery();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start discovery";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const handleReview = async (action: "approve" | "request_changes") => {
    setReviewing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/discovery/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }
      toast.success(
        action === "approve"
          ? "Discovery approved — client has been notified"
          : "Changes requested — client has been notified"
      );
      router.refresh();
      fetchDiscovery();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit review";
      toast.error(message);
    } finally {
      setReviewing(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#7C1CFF] animate-spin" />
      </div>
    );
  }

  // No discovery response yet — show "Start Discovery" card
  if (!response) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <DijiMascot variant="thinking" size="sm" className="mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Start Discovery</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Select a discovery template to assign to this project.
            The client will be notified and can begin filling out the questionnaire.
          </p>

          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl flex-1">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.sections && t.sections.length > 0).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.payrollSystem.toUpperCase()}) — {t.questionCount} questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleStart}
              disabled={starting || !selectedTemplateId}
              className="rounded-full shrink-0"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Start Discovery
            </Button>
          </div>

          {templates.length === 0 && (
            <p className="text-xs text-slate-400 mt-4">
              No discovery templates found. Create one in Settings first.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Discovery response exists — show review UI
  const statusConfig = STATUS_CONFIG[response.status] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;
  const sections = template?.sections || [];

  // Count answered questions
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = sections.reduce(
    (sum, s) =>
      sum +
      s.questions.filter((q) => {
        const answer = response.responses[q.id];
        return answer !== undefined && answer !== "" && answer !== null;
      }).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
              statusConfig.badgeClass
            )}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </span>
          <span className="text-sm text-slate-500">
            {answeredQuestions} of {totalQuestions} questions answered
          </span>
        </div>
        {response.submittedAt && (
          <span className="text-xs text-slate-400">
            Submitted {new Date(response.submittedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Section-by-section review */}
      <div className="space-y-4">
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections.has(section.id);
          const sectionAnswered = section.questions.filter((q) => {
            const answer = response.responses[q.id];
            return answer !== undefined && answer !== "" && answer !== null;
          }).length;

          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-slate-100 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-bold text-[#7C1CFF] shrink-0">
                  {sIdx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-800 flex-1">
                  {section.title}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {sectionAnswered}/{section.questions.length} answered
                </span>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-50">
                  {section.description && (
                    <p className="text-sm text-slate-500 pt-3">{section.description}</p>
                  )}

                  {section.loomUrl && (
                    <div className="pt-2">
                      <LoomEmbed url={section.loomUrl} title={`Guide: ${section.title}`} className="max-w-lg" />
                    </div>
                  )}

                  {/* Questions and answers */}
                  <div className="space-y-3 pt-2">
                    {section.questions.map((question) => {
                      const answer = response.responses[question.id];
                      const hasAnswer = answer !== undefined && answer !== "" && answer !== null;

                      return (
                        <div
                          key={question.id}
                          className="flex gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700">
                              {question.label}
                              {question.required && (
                                <span className="text-red-400 ml-0.5">*</span>
                              )}
                            </p>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {question.type}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            {hasAnswer ? (
                              <p className="text-sm text-slate-900">
                                {typeof answer === "boolean"
                                  ? answer
                                    ? "Yes"
                                    : "No"
                                  : String(answer)}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-300 italic">Not answered</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Review section — only show when in_review */}
      {response.status === "in_review" && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Review Notes</h3>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add notes for the client (optional for approval, recommended for change requests)"
            className="bg-white border-slate-200 rounded-xl min-h-[80px] text-sm"
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleReview("request_changes")}
              disabled={reviewing}
              className="rounded-full text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            >
              {reviewing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Request Changes
            </Button>
            <Button
              onClick={() => handleReview("approve")}
              disabled={reviewing}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700"
            >
              {reviewing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </div>
      )}

      {/* Review notes shown when approved or active (after changes requested) */}
      {response.status === "approved" && response.reviewNotes && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Review Notes</p>
          <p className="text-sm text-emerald-800">{response.reviewNotes}</p>
        </div>
      )}

      {/* Active but has review notes = changes were requested */}
      {response.status === "active" && response.reviewNotes && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Changes Requested</p>
          <p className="text-sm text-amber-800">{response.reviewNotes}</p>
        </div>
      )}
    </div>
  );
}
