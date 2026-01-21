"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SelectPhaseTemplateDialog } from "@/components/select-phase-template-dialog";

interface Client {
  id: string;
  companyName: string;
}

export function AddProjectDialog({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [phaseTemplateDialogOpen, setPhaseTemplateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    status: "planning",
    startDate: "",
    dueDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const data = await response.json();

      // Reset form and close dialog
      setFormData({
        name: "",
        description: "",
        clientId: "",
        status: "planning",
        startDate: "",
        dueDate: "",
      });
      setOpen(false);
      toast.success("Project created successfully");

      // Open phase template selector
      setCreatedProjectId(data.id);
      setPhaseTemplateDialogOpen(true);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="rounded-xl font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Create New Project</DialogTitle>
            <DialogDescription className="text-slate-500">
              Add a new project for one of your clients. You can add files and messages later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                required
                placeholder="Q1 2026 Implementation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the integration requirements, systems involved, and expected outcomes..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select
                  required
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">In Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Phase Template Selection Dialog */}
      {createdProjectId && (
        <SelectPhaseTemplateDialog
          projectId={createdProjectId}
          open={phaseTemplateDialogOpen}
          onOpenChange={(open) => {
            setPhaseTemplateDialogOpen(open);
            if (!open) {
              // Refresh after closing phase template dialog
              router.refresh();
              setCreatedProjectId(null);
            }
          }}
        />
      )}
    </>
  );
}
