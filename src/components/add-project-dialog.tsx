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
import { Plus, Check, UserCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  companyName: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

interface AddProjectDialogProps {
  clients: Client[];
  admins?: AdminUser[];
}

export function AddProjectDialog({ clients, admins = [] }: AddProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    startDate: "",
    dueDate: "",
  });
  const [selectedSpecialists, setSelectedSpecialists] = useState<string[]>([]);

  const toggleSpecialist = (id: string) => {
    setSelectedSpecialists((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          assignedSpecialists: selectedSpecialists,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      setFormData({
        name: "",
        description: "",
        clientId: "",
        startDate: "",
        dueDate: "",
      });
      setSelectedSpecialists([]);
      setOpen(false);
      toast.success("Project created successfully");
      router.refresh();
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

            {/* Integration Specialists multi-select */}
            {admins.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <UserCircle2 className="w-3.5 h-3.5 text-[#7C1CFF]" />
                  Integration Specialist(s)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {admins.map((admin) => {
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
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
