"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Video,
  X,
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

interface DiscoveryTemplate {
  id: string;
  name: string;
  payrollSystem: string;
  sections: Section[];
  version: number;
  isActive: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ManageDiscoveryTemplateDialogProps {
  template: DiscoveryTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function createEmptyQuestion(): Question {
  return { id: generateId(), label: "", type: "text", required: false };
}

function createEmptySection(): Section {
  return {
    id: generateId(),
    title: "",
    description: "",
    loomUrl: "",
    questions: [createEmptyQuestion()],
  };
}

export function ManageDiscoveryTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: ManageDiscoveryTemplateDialogProps) {
  const [name, setName] = useState("");
  const [payrollSystem, setPayrollSystem] = useState<string>("keypay");
  const [sections, setSections] = useState<Section[]>([createEmptySection()]);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setPayrollSystem(template.payrollSystem);
      setSections(
        template.sections.length > 0
          ? template.sections.map((s) => ({
              ...s,
              description: s.description || "",
              loomUrl: s.loomUrl || "",
              questions: s.questions.length > 0 ? s.questions : [createEmptyQuestion()],
            }))
          : [createEmptySection()]
      );
      // Expand all sections when editing
      setExpandedSections(new Set(template.sections.map((s) => s.id)));
    } else {
      setName("");
      setPayrollSystem("keypay");
      const section = createEmptySection();
      setSections([section]);
      setExpandedSections(new Set([section.id]));
    }
  }, [template, open]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const addSection = () => {
    const section = createEmptySection();
    setSections([...sections, section]);
    setExpandedSections((prev) => new Set(prev).add(section.id));
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) {
      toast.error("Templates must have at least one section");
      return;
    }
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, field: keyof Section, value: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s))
    );
  };

  const addQuestion = (sectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, createEmptyQuestion()] }
          : s
      )
    );
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        if (s.questions.length <= 1) {
          toast.error("Sections must have at least one question");
          return s;
        }
        return { ...s, questions: s.questions.filter((q) => q.id !== questionId) };
      })
    );
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    field: keyof Question,
    value: unknown
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, [field]: value } : q
              ),
            }
          : s
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    // Validate sections
    for (const section of sections) {
      if (!section.title.trim()) {
        toast.error("All sections must have a title");
        return;
      }
      for (const question of section.questions) {
        if (!question.label.trim()) {
          toast.error(`All questions in "${section.title}" must have a label`);
          return;
        }
        if (question.type === "select" && (!question.options || question.options.length < 2)) {
          toast.error(`Select questions in "${section.title}" must have at least 2 options`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const url = isEditing
        ? `/api/discovery-templates/${template.id}`
        : "/api/discovery-templates";
      const method = isEditing ? "PUT" : "POST";

      // Clean up sections: remove empty loom URLs
      const cleanSections = sections.map((s) => ({
        ...s,
        loomUrl: s.loomUrl?.trim() || undefined,
        description: s.description?.trim() || undefined,
        questions: s.questions.map((q) => ({
          ...q,
          options: q.type === "select" ? q.options?.filter((o) => o.trim()) : undefined,
        })),
      }));

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payrollSystem, sections: cleanSections }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      toast.success(isEditing ? "Template updated" : "Template created");
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save template";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Discovery Template" : "Create Discovery Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Template metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Template Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard KeyPay Discovery"
                className="bg-white border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payroll System
              </Label>
              <Select value={payrollSystem} onValueChange={setPayrollSystem}>
                <SelectTrigger className="bg-white border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keypay">KeyPay</SelectItem>
                  <SelectItem value="myob">MYOB</SelectItem>
                  <SelectItem value="deputy">Deputy</SelectItem>
                  <SelectItem value="generic">Generic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{sections.length} section{sections.length !== 1 ? "s" : ""}</span>
            <span className="text-slate-300">|</span>
            <span>{totalQuestions} question{totalQuestions !== 1 ? "s" : ""}</span>
          </div>

          {/* Sections builder */}
          <div className="space-y-4">
            {sections.map((section, sIdx) => {
              const isExpanded = expandedSections.has(section.id);
              return (
                <div
                  key={section.id}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50"
                >
                  {/* Section header */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-400 shrink-0">
                      {sIdx + 1}.
                    </span>
                    <span className="text-sm font-semibold text-slate-700 flex-1 truncate">
                      {section.title || "Untitled Section"}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {section.questions.length} Q{section.questions.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSection(section.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Section body */}
                  {isExpanded && (
                    <div className="px-4 py-4 space-y-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-500">Section Title</Label>
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, "title", e.target.value)}
                            placeholder="e.g. Organisation Information"
                            className="bg-white border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-500">Description (optional)</Label>
                          <Textarea
                            value={section.description}
                            onChange={(e) => updateSection(section.id, "description", e.target.value)}
                            placeholder="Brief description of what this section covers"
                            className="bg-white border-slate-200 rounded-lg text-sm min-h-[60px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" />
                            Loom URL (optional)
                          </Label>
                          <Input
                            value={section.loomUrl}
                            onChange={(e) => updateSection(section.id, "loomUrl", e.target.value)}
                            placeholder="https://www.loom.com/share/..."
                            className="bg-white border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Questions
                        </Label>
                        {section.questions.map((question, qIdx) => (
                          <QuestionEditor
                            key={question.id}
                            question={question}
                            index={qIdx}
                            onUpdate={(field, value) =>
                              updateQuestion(section.id, question.id, field, value)
                            }
                            onRemove={() => removeQuestion(section.id, question.id)}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addQuestion(section.id)}
                          className="rounded-lg text-xs w-full border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Question
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addSection}
            className="rounded-xl w-full border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full"
            >
              {saving
                ? "Saving..."
                : isEditing
                ? "Update Template"
                : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Question editor sub-component
function QuestionEditor({
  question,
  index,
  onUpdate,
  onRemove,
}: {
  question: Question;
  index: number;
  onUpdate: (field: keyof Question, value: unknown) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100">
      <span className="text-xs font-bold text-slate-300 mt-2.5 shrink-0 w-5 text-center">
        {index + 1}
      </span>
      <div className="flex-1 space-y-2">
        <Input
          value={question.label}
          onChange={(e) => onUpdate("label", e.target.value)}
          placeholder="Question text..."
          className="bg-white border-slate-200 rounded-lg text-sm h-9"
        />
        <div className="flex items-center gap-3">
          <Select
            value={question.type}
            onValueChange={(v) => {
              onUpdate("type", v);
              if (v === "select" && (!question.options || question.options.length === 0)) {
                onUpdate("options", ["", ""]);
              }
            }}
          >
            <SelectTrigger className="w-32 h-8 text-xs bg-white border-slate-200 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Short text</SelectItem>
              <SelectItem value="textarea">Long text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={question.required}
              onCheckedChange={(v) => onUpdate("required", v)}
              className="h-4 w-8"
            />
            <span className="text-xs text-slate-500">Required</span>
          </div>
        </div>
        {/* Options for select type */}
        {question.type === "select" && (
          <div className="space-y-1.5 pl-1">
            {(question.options || []).map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...(question.options || [])];
                    newOptions[oIdx] = e.target.value;
                    onUpdate("options", newOptions);
                  }}
                  placeholder={`Option ${oIdx + 1}`}
                  className="bg-white border-slate-200 rounded-lg text-xs h-8 flex-1"
                />
                <button
                  onClick={() => {
                    const newOptions = (question.options || []).filter(
                      (_, i) => i !== oIdx
                    );
                    onUpdate("options", newOptions);
                  }}
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onUpdate("options", [...(question.options || []), ""])}
              className="text-xs h-7 text-slate-500"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add option
            </Button>
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0 mt-1"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
