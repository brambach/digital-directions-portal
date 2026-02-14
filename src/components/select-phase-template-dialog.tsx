"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhaseTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  phases: {
    id: string;
    name: string;
    description: string | null;
    orderIndex: number;
    estimatedDays: number | null;
  }[];
}

interface SelectPhaseTemplateDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SelectPhaseTemplateDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: SelectPhaseTemplateDialogProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/phase-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        // Auto-select default template
        const defaultTemplate = data.find((t: PhaseTemplate) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate.id);
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/phases/apply-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplate }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to apply template");
      }

      toast.success("Phase template applied successfully");
      router.refresh();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template");
    } finally {
      setApplying(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Phase Template</DialogTitle>
          <DialogDescription>
            Choose a phase template to track project progress, or skip to add phases later
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all hover:border-violet-300",
                  selectedTemplate === template.id
                    ? "border-violet-600 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-violet-700" />
                      <h3 className="font-semibold text-slate-900">
                        {template.name}
                      </h3>
                      {template.isDefault && (
                        <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium">
                          DEFAULT
                        </span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-slate-600 mb-3">
                        {template.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {template.phases.map((phase, index) => (
                        <span
                          key={phase.id}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium"
                        >
                          {index + 1}. {phase.name}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      {template.phases.length} phases
                      {template.phases.some((p) => p.estimatedDays) &&
                        ` • Est. ${template.phases.reduce(
                          (sum, p) => sum + (p.estimatedDays || 0),
                          0
                        )} days`}
                    </p>
                  </div>

                  {selectedTemplate === template.id && (
                    <CheckCircle className="w-5 h-5 text-violet-700 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>No phase templates available</p>
                <p className="text-sm mt-2">
                  You can still create the project and add phases manually later
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={applying}
          >
            <X className="w-4 h-4" />
            Skip for Now
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            disabled={!selectedTemplate || applying}
          >
            <CheckCircle className="w-4 h-4" />
            {applying ? "Applying..." : "Apply Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
