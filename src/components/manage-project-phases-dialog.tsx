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
  id: string; // existing phase ID or temp ID for new phases
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  notes: string;
  orderIndex: number;
  isNew?: boolean; // flag to track new phases
  isDeleted?: boolean; // flag to track deleted phases
}

interface ManageProjectPhasesDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ManageProjectPhasesDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: ManageProjectPhasesDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phases, setPhases] = useState<PhaseInput[]>([]);
  const [originalPhases, setOriginalPhases] = useState<PhaseInput[]>([]);

  useEffect(() => {
    if (open) {
      fetchPhases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const fetchPhases = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/phases`);
      if (response.ok) {
        const data = await response.json();
        const phaseInputs: PhaseInput[] = data.map((phase: any) => ({
          id: phase.id,
          name: phase.name,
          description: phase.description || "",
          status: phase.status,
          notes: phase.notes || "",
          orderIndex: phase.orderIndex,
          isNew: false,
          isDeleted: false,
        }));
        setPhases(phaseInputs);
        setOriginalPhases(JSON.parse(JSON.stringify(phaseInputs))); // Deep copy
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
      toast.error("Failed to load phases");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhase = () => {
    const newPhase: PhaseInput = {
      id: `temp-${crypto.randomUUID()}`,
      name: "",
      description: "",
      status: "pending",
      notes: "",
      orderIndex: phases.length,
      isNew: true,
      isDeleted: false,
    };
    setPhases([...phases, newPhase]);
  };

  const handleRemovePhase = (id: string) => {
    const phase = phases.find((p) => p.id === id);
    if (!phase) return;

    if (phases.filter((p) => !p.isDeleted).length === 1) {
      toast.error("Project must have at least one phase");
      return;
    }

    if (phase.isNew) {
      // Just remove it from the array if it's new
      setPhases(phases.filter((p) => p.id !== id));
    } else {
      // Mark existing phase as deleted
      setPhases(
        phases.map((p) => (p.id === id ? { ...p, isDeleted: true } : p))
      );
    }
  };

  const handlePhaseChange = (
    id: string,
    field: keyof PhaseInput,
    value: string
  ) => {
    setPhases(
      phases.map((phase) =>
        phase.id === id ? { ...phase, [field]: value } : phase
      )
    );
  };

  const handleMovePhase = (index: number, direction: "up" | "down") => {
    const activePhases = phases.filter((p) => !p.isDeleted);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= activePhases.length) return;

    const newActivePhases = [...activePhases];
    [newActivePhases[index], newActivePhases[targetIndex]] = [
      newActivePhases[targetIndex],
      newActivePhases[index],
    ];

    // Update orderIndex for all active phases
    const updatedPhases = newActivePhases.map((phase, idx) => ({
      ...phase,
      orderIndex: idx,
    }));

    // Merge with deleted phases
    const deletedPhases = phases.filter((p) => p.isDeleted);
    setPhases([...updatedPhases, ...deletedPhases]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validation
      const activePhases = phases.filter((p) => !p.isDeleted);
      if (activePhases.some((p) => !p.name.trim())) {
        toast.error("All phases must have a name");
        setSaving(false);
        return;
      }

      if (activePhases.length === 0) {
        toast.error("Project must have at least one phase");
        setSaving(false);
        return;
      }

      // Track operations
      const operations: Promise<any>[] = [];

      // 1. Delete removed phases
      const phasesToDelete = phases.filter(
        (p) => p.isDeleted && !p.isNew
      );
      for (const phase of phasesToDelete) {
        operations.push(
          fetch(`/api/projects/${projectId}/phases/${phase.id}`, {
            method: "DELETE",
          })
        );
      }

      // 2. Create new phases
      const newPhases = phases.filter((p) => p.isNew && !p.isDeleted);
      for (const phase of newPhases) {
        operations.push(
          fetch(`/api/projects/${projectId}/phases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: phase.name.trim(),
              description: phase.description.trim() || null,
              orderIndex: phase.orderIndex,
              status: phase.status,
            }),
          })
        );
      }

      // 3. Update existing phases (check if changed)
      const existingPhases = phases.filter((p) => !p.isNew && !p.isDeleted);
      for (const phase of existingPhases) {
        const original = originalPhases.find((o) => o.id === phase.id);
        if (
          original &&
          (original.name !== phase.name ||
            original.description !== phase.description ||
            original.status !== phase.status ||
            original.notes !== phase.notes)
        ) {
          operations.push(
            fetch(`/api/projects/${projectId}/phases/${phase.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: phase.name.trim(),
                description: phase.description.trim() || null,
                status: phase.status,
                notes: phase.notes.trim() || null,
              }),
            })
          );
        }
      }

      // Execute all operations
      const results = await Promise.all(operations);
      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        throw new Error("Some operations failed");
      }

      // 4. Reorder if needed (must happen after creates/deletes)
      // Wait a bit for the creates to complete and get their IDs
      if (newPhases.length > 0 || phasesToDelete.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Fetch the updated phases to get correct IDs
      const updatedResponse = await fetch(`/api/projects/${projectId}/phases`);
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        const phaseIds = updatedData
          .sort((a: any, b: any) => {
            // Match by name to preserve order
            const aIndex = activePhases.findIndex((p) => p.name === a.name);
            const bIndex = activePhases.findIndex((p) => p.name === b.name);
            return aIndex - bIndex;
          })
          .map((p: any) => p.id);

        // Only reorder if the order changed
        const currentOrder = updatedData
          .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
          .map((p: any) => p.id);

        if (JSON.stringify(phaseIds) !== JSON.stringify(currentOrder)) {
          await fetch(`/api/projects/${projectId}/phases/reorder`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phaseIds }),
          });
        }
      }

      toast.success("Phases updated successfully");
      router.refresh();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving phases:", error);
      toast.error(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const activePhases = phases.filter((p) => !p.isDeleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Project Phases</DialogTitle>
          <DialogDescription>
            Add, remove, reorder, or edit phases for this project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200 animate-pulse"
                >
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Phases ({activePhases.length})
                </Label>
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
                {activePhases.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No phases. Click &ldquo;Add Phase&rdquo; to create one.
                  </div>
                ) : (
                  activePhases.map((phase, index) => (
                    <div
                      key={phase.id}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        {/* Reorder Arrows */}
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
                            disabled={index === activePhases.length - 1}
                            className={cn(
                              "p-1 rounded hover:bg-slate-200 transition-colors",
                              index === activePhases.length - 1 &&
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
                                  handlePhaseChange(
                                    phase.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., Discovery"
                                required
                                className="mt-1"
                                maxLength={255}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Status</Label>
                              <select
                                value={phase.status}
                                onChange={(e) =>
                                  handlePhaseChange(
                                    phase.id,
                                    "status",
                                    e.target.value
                                  )
                                }
                                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="skipped">Skipped</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">
                              Description (Optional)
                            </Label>
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
                          <div>
                            <Label className="text-xs">Notes (Optional)</Label>
                            <Textarea
                              value={phase.notes}
                              onChange={(e) =>
                                handlePhaseChange(
                                  phase.id,
                                  "notes",
                                  e.target.value
                                )
                              }
                              placeholder="Internal notes about this phase"
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
                          disabled={activePhases.length === 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-slate-500">
                Use the arrows to reorder phases. Changes will be saved when you
                click &ldquo;Save Changes&rdquo;.
              </p>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || loading}
              className="bg-purple-700 hover:bg-purple-800"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
