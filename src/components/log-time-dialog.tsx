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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock } from "lucide-react";

interface LogTimeDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LogTimeDialog({
  ticketId,
  open,
  onOpenChange,
  onSuccess,
}: LogTimeDialogProps) {
  const router = useRouter();
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [countTowardsSupportHours, setCountTowardsSupportHours] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hoursNum = parseFloat(hours) || 0;
    const minutesNum = parseFloat(minutes) || 0;
    const totalMinutes = hoursNum * 60 + minutesNum;

    if (totalMinutes <= 0) {
      toast.error("Please enter a valid time duration");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: totalMinutes,
          description: description.trim() || null,
          countTowardsSupportHours,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log time");
      }

      toast.success("Time logged successfully");
      setHours("");
      setMinutes("");
      setDescription("");
      onOpenChange(false);
      router.refresh();
      onSuccess();
    } catch (error) {
      console.error("Error logging time:", error);
      toast.error("Failed to log time");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>
            Record time spent working on this ticket
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Time Input */}
          <div className="space-y-2">
            <Label>Time Spent</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    hours
                  </span>
                </div>
              </div>
              <div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    mins
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              e.g., 1.5 hours or 1 hour 30 minutes
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What did you work on?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Count towards support hours */}
          <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-100 rounded-lg">
            <input
              type="checkbox"
              id="countTowardsSupportHours"
              checked={countTowardsSupportHours}
              onChange={(e) => setCountTowardsSupportHours(e.target.checked)}
              className="mt-0.5 rounded border-purple-300 text-purple-700 focus:ring-purple-600"
            />
            <div className="flex-1">
              <label
                htmlFor="countTowardsSupportHours"
                className="text-sm font-medium text-purple-900 cursor-pointer"
              >
                Count towards support hours
              </label>
              <p className="text-xs text-purple-700 mt-1">
                This time will be deducted from the client&apos;s monthly support hour balance
              </p>
            </div>
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
              <Clock className="w-4 h-4" />
              {loading ? "Logging..." : "Log Time"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
