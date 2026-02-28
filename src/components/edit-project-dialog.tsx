"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Plus, UserCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

interface EditProjectDialogProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    startDate: Date | null;
    dueDate: Date | null;
    assignedSpecialists?: string[];
  };
  adminUsers?: AdminUser[];
}

export function EditProjectDialog({ project, adminUsers = [] }: EditProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || "",
    startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
    dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : "",
  });
  const [selectedSpecialists, setSelectedSpecialists] = useState<string[]>(
    project.assignedSpecialists || []
  );

  const toggleSpecialist = (id: string) => {
    setSelectedSpecialists((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          startDate: formData.startDate || null,
          dueDate: formData.dueDate || null,
          assignedSpecialists: selectedSpecialists,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      router.refresh();
      setOpen(false);
      toast.success("Project updated successfully");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl font-semibold text-gray-600">
          Edit Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Integration Specialists */}
          {adminUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserCircle2 className="w-3.5 h-3.5 text-[#7C1CFF]" />
                Integration Specialist(s)
              </Label>
              <div className="flex flex-wrap gap-2">
                {adminUsers.map((admin) => {
                  const selected = selectedSpecialists.includes(admin.id);
                  return (
                    <button
                      key={admin.id}
                      type="button"
                      onClick={() => toggleSpecialist(admin.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        selected
                          ? "bg-violet-50 border-[#7C1CFF] text-[#7C1CFF]"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {selected ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3 opacity-50" />
                      )}
                      {admin.name}
                    </button>
                  );
                })}
              </div>
              {selectedSpecialists.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSpecialists([])}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                  Clear selection
                </button>
              )}
            </div>
          )}

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
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
