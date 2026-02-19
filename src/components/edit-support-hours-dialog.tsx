"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EditSupportHoursDialogProps {
  clientId: string;
  currentHours: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditSupportHoursDialog({
  clientId,
  currentHours,
  open,
  onOpenChange,
  onUpdate,
}: EditSupportHoursDialogProps) {
  const router = useRouter();
  const [hours, setHours] = useState(currentHours.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum < 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/support-hours`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursPerMonth: hoursNum }),
      });

      if (!response.ok) {
        throw new Error("Failed to update support hours");
      }

      toast.success("Support hours updated successfully");
      onUpdate();
      router.refresh();
    } catch (error) {
      console.error("Error updating support hours:", error);
      toast.error("Failed to update support hours");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Support Hours Package</DialogTitle>
          <DialogDescription>
            Set the monthly support hours allocation for this client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="hours">Monthly Hours</Label>
            <div className="relative">
              <input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="e.g., 10"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                hours/month
              </span>
            </div>
            <p className="text-xs text-slate-500">
              This is the total number of support hours allocated to the client each month.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-900 mb-2">How it works</h4>
            <ul className="text-xs text-purple-700 space-y-1">
              <li>• Time logged on tickets deducts from this balance</li>
              <li>• Hours reset automatically at the end of each billing cycle</li>
              <li>• Client can see their remaining hours on their dashboard</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
