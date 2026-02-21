"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Save,
  Send,
  Video,
  AlertTriangle,
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

interface ClientDiscoveryContentProps {
  projectId: string;
}

export function ClientDiscoveryContent({ projectId }: ClientDiscoveryContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<DiscoveryResponse | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLoom, setShowLoom] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const fetchDiscovery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/discovery`);
      if (res.ok) {
        const data = await res.json();
        setResponse(data.response);
        setTemplate(data.template);
        if (data.response?.responses) {
          setAnswers(data.response.responses);
        }
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

  // Auto-save (debounced)
  const saveDraft = useCallback(
    async (answersToSave: Record<string, string | boolean>) => {
      try {
        setSaving(true);
        const res = await fetch(`/api/projects/${projectId}/discovery`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responses: answersToSave }),
        });
        if (res.ok) {
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error("Error saving draft:", error);
      } finally {
        setSaving(false);
      }
    },
    [projectId]
  );

  const handleAnswerChange = (questionId: string, value: string | boolean) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Debounced auto-save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(newAnswers);
    }, 1500);
  };

  const handleSaveAndContinue = async () => {
    await saveDraft(answers);
    if (template && currentSection < template.sections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    if (!template) return;

    // Validate all required questions are answered
    const unanswered: string[] = [];
    for (const section of template.sections) {
      for (const q of section.questions) {
        if (q.required) {
          const answer = answers[q.id];
          if (answer === undefined || answer === "" || answer === null) {
            unanswered.push(`"${q.label}" in "${section.title}"`);
          }
        }
      }
    }

    if (unanswered.length > 0) {
      toast.error(`Please complete all required fields. Missing: ${unanswered.slice(0, 3).join(", ")}${unanswered.length > 3 ? ` and ${unanswered.length - 3} more` : ""}`);
      return;
    }

    setSubmitting(true);
    try {
      // Save final answers
      await saveDraft(answers);

      // Submit
      const res = await fetch(`/api/projects/${projectId}/discovery/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      toast.success("Questionnaire submitted for review!");
      router.refresh();
      fetchDiscovery();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#7C1CFF] animate-spin" />
      </div>
    );
  }

  // No response — waiting for admin
  if (!response) {
    return (
      <div className="text-center py-12">
        <DijiMascot variant="thinking" size="sm" className="mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-700 mb-1">
          Your discovery questionnaire is being prepared
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          The Digital Directions team is setting up your questionnaire.
          You&apos;ll be notified when it&apos;s ready.
        </p>
      </div>
    );
  }

  // In review — read only
  if (response.status === "in_review") {
    return (
      <ReadOnlyView
        template={template}
        answers={answers}
        bannerType="review"
      />
    );
  }

  // Approved — read only with green banner
  if (response.status === "approved") {
    return (
      <ReadOnlyView
        template={template}
        answers={answers}
        bannerType="approved"
        reviewNotes={response.reviewNotes}
      />
    );
  }

  // Active — editable wizard
  if (!template) return null;

  const sections = template.sections;
  const section = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  // Calculate progress
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = sections.reduce(
    (sum, s) =>
      sum +
      s.questions.filter((q) => {
        const answer = answers[q.id];
        return answer !== undefined && answer !== "" && answer !== null;
      }).length,
    0
  );
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Changes requested banner */}
      {response.reviewNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Changes Requested</p>
            <p className="text-sm text-amber-700 mt-1">{response.reviewNotes}</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            Section {currentSection + 1} of {sections.length} — {section.title}
          </span>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            {!saving && lastSaved && (
              <span className="text-xs text-slate-400">
                Saved
              </span>
            )}
            <span className="text-xs font-medium text-slate-500">
              {progressPercent}% complete
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7C1CFF] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Section navigation pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {sections.map((s, idx) => {
          const sectionAnswered = s.questions.filter((q) => {
            const answer = answers[q.id];
            return answer !== undefined && answer !== "" && answer !== null;
          }).length;
          const isComplete = sectionAnswered === s.questions.length;

          return (
            <button
              key={s.id}
              onClick={() => {
                saveDraft(answers);
                setCurrentSection(idx);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                idx === currentSection
                  ? "bg-[#7C1CFF] text-white"
                  : isComplete
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {isComplete && idx !== currentSection && (
                <Check className="w-3 h-3" />
              )}
              {idx + 1}. {s.title}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6">
        {/* Section header */}
        <div>
          <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
          {section.description && (
            <p className="text-sm text-slate-500 mt-1">{section.description}</p>
          )}
        </div>

        {/* Loom video */}
        {section.loomUrl && (
          <div>
            {showLoom === section.id ? (
              <div className="space-y-2">
                <LoomEmbed url={section.loomUrl} title={`Guide: ${section.title}`} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLoom(null)}
                  className="text-xs text-slate-500"
                >
                  Hide video
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoom(section.id)}
                className="rounded-full text-xs border-violet-200 text-[#7C1CFF] hover:bg-violet-50"
              >
                <Video className="w-3.5 h-3.5 mr-1.5" />
                Watch guide
              </Button>
            )}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-5">
          {section.questions.map((question) => (
            <QuestionInput
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(value) => handleAnswerChange(question.id, value)}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            saveDraft(answers);
            setCurrentSection(Math.max(0, currentSection - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          disabled={currentSection === 0}
          className="rounded-full"
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Previous
        </Button>

        <div className="flex gap-3">
          {isLastSection ? (
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
              Submit for Review
            </Button>
          ) : (
            <Button
              onClick={handleSaveAndContinue}
              className="rounded-full"
            >
              Save & Continue
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Question input renderer
function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const stringValue = typeof value === "boolean" ? "" : (value || "");

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {question.label}
        {question.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {question.type === "text" && (
        <Input
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          className="bg-white border-slate-200 rounded-xl"
        />
      )}

      {question.type === "textarea" && (
        <Textarea
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          className="bg-white border-slate-200 rounded-xl min-h-[100px]"
        />
      )}

      {question.type === "number" && (
        <Input
          type="number"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a number..."
          className="bg-white border-slate-200 rounded-xl w-48"
        />
      )}

      {question.type === "select" && question.options && (
        <Select value={stringValue} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="bg-white border-slate-200 rounded-xl w-full max-w-sm">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {question.type === "checkbox" && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true || value === "true"}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-[#7C1CFF] focus:ring-[#7C1CFF]"
          />
          <span className="text-sm text-slate-600">Yes</span>
        </label>
      )}
    </div>
  );
}

// Read-only view for in_review and approved states
function ReadOnlyView({
  template,
  answers,
  bannerType,
  reviewNotes,
}: {
  template: Template | null;
  answers: Record<string, string | boolean>;
  bannerType: "review" | "approved";
  reviewNotes?: string | null;
}) {
  if (!template) return null;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {bannerType === "review" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <DijiMascot variant="construction" size="xs" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Your questionnaire is being reviewed
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your responses. You&apos;ll be notified when the review is complete.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Discovery questionnaire approved
            </p>
            {reviewNotes && (
              <p className="text-xs text-emerald-600 mt-0.5">{reviewNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Read-only sections */}
      {template.sections.map((section, sIdx) => (
        <div
          key={section.id}
          className="bg-white rounded-xl border border-slate-100 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7C1CFF]">{sIdx + 1}</span>
            <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>
          </div>

          <div className="space-y-3">
            {section.questions.map((q) => {
              const answer = answers[q.id];
              const hasAnswer = answer !== undefined && answer !== "" && answer !== null;

              return (
                <div key={q.id} className="flex gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {q.label}
                      {q.required && <span className="text-red-400 ml-0.5">*</span>}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    {hasAnswer ? (
                      <p className="text-sm text-slate-900">
                        {typeof answer === "boolean" ? (answer ? "Yes" : "No") : String(answer)}
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
      ))}
    </div>
  );
}
