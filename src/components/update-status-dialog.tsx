"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UpdateStatusDialogProps {
  projectId: string;
  currentStatus: string;
}

const statuses = [
  { value: "planning", label: "Planning", color: "bg-slate-50 text-slate-600 border-slate-200" },
  { value: "in_progress", label: "In Progress", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  { value: "review", label: "In Review", color: "bg-purple-50 text-purple-600 border-purple-200" },
  { value: "completed", label: "Completed", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { value: "on_hold", label: "On Hold", color: "bg-orange-50 text-orange-600 border-orange-200" },
];

export function UpdateStatusDialog({ projectId, currentStatus }: UpdateStatusDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
      setOpen(false);
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl font-semibold shadow-sm">
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Project Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Select Status</Label>
            <div className="grid gap-2 mt-2">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setSelectedStatus(status.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selectedStatus === status.value
                      ? `${status.color} ring-2 ring-indigo-500`
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                >
                  <span className="font-medium">{status.label}</span>
                </button>
              ))}
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
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
