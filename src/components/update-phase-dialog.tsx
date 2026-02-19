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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, Trash2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Phase {
  id: string;
  name: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "skipped";
  orderIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface UpdatePhaseDialogProps {
  projectId: string;
  phase: Phase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function UpdatePhaseDialog({
  projectId,
  phase,
  open,
  onOpenChange,
  onUpdate,
}: UpdatePhaseDialogProps) {
  const router = useRouter();
  const [status, setStatus] = useState(phase?.status || "pending");
  const [notes, setNotes] = useState(phase?.notes || "");
  const [name, setName] = useState(phase?.name || "");
  const [description, setDescription] = useState(phase?.description || "");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("quick");

  useEffect(() => {
    if (phase) {
      setStatus(phase.status);
      setNotes(phase.notes || "");
      setName(phase.name);
      setDescription(phase.description || "");
      setActiveTab("quick"); // Reset to quick tab when phase changes
    }
  }, [phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phase) return;

    // Validation
    if (activeTab === "full" && !name.trim()) {
      toast.error("Phase name is required");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        status,
        notes: notes.trim() || null,
      };

      // Include name and description only if on Full Edit tab
      if (activeTab === "full") {
        payload.name = name.trim();
        payload.description = description.trim() || null;
      }

      const response = await fetch(
        `/api/projects/${projectId}/phases/${phase.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update phase");
      }

      toast.success("Phase updated successfully");
      onOpenChange(false);
      router.refresh();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating phase:", error);
      toast.error("Failed to update phase");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!phase) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/phases/${phase.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete phase");
      }

      toast.success("Phase deleted successfully");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      router.refresh();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting phase:", error);
      toast.error("Failed to delete phase");
    } finally {
      setDeleting(false);
    }
  };

  if (!phase) return null;

  const statusOptions = [
    { value: "pending", label: "Pending", color: "slate" },
    { value: "in_progress", label: "In Progress", color: "purple" },
    { value: "completed", label: "Completed", color: "emerald" },
    { value: "skipped", label: "Skipped", color: "slate" },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Phase</DialogTitle>
            <DialogDescription>{phase.name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="quick">Quick Update</TabsTrigger>
                <TabsTrigger value="full">Full Edit</TabsTrigger>
              </TabsList>

              {/* Quick Update Tab */}
              <TabsContent value="quick" className="space-y-6">
                {/* Phase Description */}
                {phase.description && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <p className="text-sm text-slate-600">{phase.description}</p>
                  </div>
                )}

                {/* Status Selection */}
                <div className="space-y-2">
                  <Label>Phase Status</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStatus(option.value as any)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          status === option.value
                            ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700 shadow-sm`
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this phase..."
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Notes will be visible to team members but not clients
                  </p>
                </div>

                {/* Phase Dates Info */}
                {(phase.startedAt || phase.completedAt) && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 space-y-1">
                    <p className="text-xs font-semibold text-purple-900 mb-2">Phase Timeline</p>
                    {phase.startedAt && (
                      <p className="text-xs text-purple-700">
                        Started: {new Date(phase.startedAt).toLocaleDateString()}
                      </p>
                    )}
                    {phase.completedAt && (
                      <p className="text-xs text-purple-700">
                        Completed: {new Date(phase.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Status Change Info */}
                {status !== phase.status && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <p className="text-xs text-purple-900">
                      {status === "in_progress" &&
                        "This phase will be marked as the current active phase"}
                      {status === "completed" &&
                        "Completion timestamp will be recorded automatically"}
                      {status === "skipped" && "This phase will be marked as skipped"}
                      {status === "pending" && "This phase will be reset to pending"}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Full Edit Tab */}
              <TabsContent value="full" className="space-y-6">
                {/* Phase Name */}
                <div className="space-y-2">
                  <Label htmlFor="phase-name">Phase Name</Label>
                  <Input
                    id="phase-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Discovery Phase"
                    required
                    maxLength={255}
                  />
                </div>

                {/* Phase Description */}
                <div className="space-y-2">
                  <Label htmlFor="phase-description">Description (Optional)</Label>
                  <Textarea
                    id="phase-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this phase..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-2">
                  <Label>Phase Status</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStatus(option.value as any)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          status === option.value
                            ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700 shadow-sm`
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes-full">Notes (Optional)</Label>
                  <Textarea
                    id="notes-full"
                    placeholder="Add any notes about this phase..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none"
                  />
                </div>

                {/* Delete Phase Button */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Phase
                  </button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
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
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? "Updating..." : "Update Phase"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Phase
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{phase?.name}&rdquo;? This action cannot be undone.
              {phase?.status === "in_progress" && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This is the currently active phase.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete Phase"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
