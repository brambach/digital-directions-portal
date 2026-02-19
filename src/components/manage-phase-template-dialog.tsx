"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhaseInput {
  id: string; // temp ID for React keys
  name: string;
  description: string;
  estimatedDays: string;
}

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

interface ManagePhaseTemplateDialogProps {
  template?: PhaseTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ManagePhaseTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: ManagePhaseTemplateDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [phases, setPhases] = useState<PhaseInput[]>([
    { id: crypto.randomUUID(), name: "", description: "", estimatedDays: "" },
  ]);

  // Load template data when editing
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setIsDefault(template.isDefault);
      setPhases(
        template.phases.map((phase) => ({
          id: phase.id,
          name: phase.name,
          description: phase.description || "",
          estimatedDays: phase.estimatedDays?.toString() || "",
        }))
      );
    } else {
      // Reset for create mode
      setName("");
      setDescription("");
      setIsDefault(false);
      setPhases([
        { id: crypto.randomUUID(), name: "", description: "", estimatedDays: "" },
      ]);
    }
  }, [template, open]);

  const handleAddPhase = () => {
    setPhases([
      ...phases,
      { id: crypto.randomUUID(), name: "", description: "", estimatedDays: "" },
    ]);
  };

  const handleRemovePhase = (id: string) => {
    if (phases.length === 1) {
      toast.error("Template must have at least one phase");
      return;
    }
    setPhases(phases.filter((phase) => phase.id !== id));
  };

  const handlePhaseChange = (id: string, field: keyof PhaseInput, value: string) => {
    setPhases(
      phases.map((phase) =>
        phase.id === id ? { ...phase, [field]: value } : phase
      )
    );
  };

  const handleMovePhase = (index: number, direction: "up" | "down") => {
    const newPhases = [...phases];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newPhases.length) return;

    [newPhases[index], newPhases[targetIndex]] = [
      newPhases[targetIndex],
      newPhases[index],
    ];

    setPhases(newPhases);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!name.trim()) {
        toast.error("Template name is required");
        setLoading(false);
        return;
      }

      if (phases.some((p) => !p.name.trim())) {
        toast.error("All phases must have a name");
        setLoading(false);
        return;
      }

      // Prepare payload
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        isDefault,
        phases: phases.map((phase, index) => ({
          name: phase.name.trim(),
          description: phase.description.trim() || null,
          orderIndex: index,
          estimatedDays: phase.estimatedDays
            ? parseInt(phase.estimatedDays)
            : null,
        })),
      };

      const url = template
        ? `/api/phase-templates/${template.id}`
        : "/api/phase-templates";
      const method = template ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      toast.success(
        template
          ? "Template updated successfully"
          : "Template created successfully"
      );

      router.refresh();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Phase Template" : "Create Phase Template"}
          </DialogTitle>
          <DialogDescription>
            {template
              ? "Update the template details and phases"
              : "Create a new reusable phase template for projects"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard HiBob Implementation"
              required
            />
          </div>

          {/* Template Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">
              Description (Optional)
            </Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template"
              rows={2}
            />
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-purple-700 rounded focus:ring-purple-600"
            />
            <Label htmlFor="is-default" className="cursor-pointer">
              Set as default template (will be auto-selected when creating projects)
            </Label>
          </div>

          {/* Phases Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Phases</Label>
              <Button
                type="button"
                onClick={handleAddPhase}
                size="sm"
                variant="outline"
                className="text-purple-700 border-purple-200 hover:bg-purple-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Phase
              </Button>
            </div>

            <div className="space-y-3">
              {phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1 pt-2">
                      <button
                        type="button"
                        onClick={() => handleMovePhase(index, "up")}
                        disabled={index === 0}
                        className={cn(
                          "p-1 rounded hover:bg-slate-200 transition-colors",
                          index === 0 && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePhase(index, "down")}
                        disabled={index === phases.length - 1}
                        className={cn(
                          "p-1 rounded hover:bg-slate-200 transition-colors",
                          index === phases.length - 1 &&
                            "opacity-30 cursor-not-allowed"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-slate-400 rotate-180" />
                      </button>
                    </div>

                    {/* Phase Number Badge */}
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm shrink-0 mt-2">
                      {index + 1}
                    </div>

                    {/* Phase Fields */}
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Phase Name</Label>
                          <Input
                            value={phase.name}
                            onChange={(e) =>
                              handlePhaseChange(phase.id, "name", e.target.value)
                            }
                            placeholder="e.g., Integration Build"
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Estimated Days</Label>
                          <Input
                            type="number"
                            min="0"
                            value={phase.estimatedDays}
                            onChange={(e) =>
                              handlePhaseChange(
                                phase.id,
                                "estimatedDays",
                                e.target.value
                              )
                            }
                            placeholder="Optional"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Description (Optional)</Label>
                        <Textarea
                          value={phase.description}
                          onChange={(e) =>
                            handlePhaseChange(
                              phase.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Brief description of this phase"
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      onClick={() => handleRemovePhase(phase.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 mt-2"
                      disabled={phases.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Phases will be shown in this order. Use the arrows to reorder.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-700 hover:bg-purple-800"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : template ? (
                "Update Template"
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
