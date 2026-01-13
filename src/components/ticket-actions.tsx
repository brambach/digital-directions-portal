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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, CheckCircle, Clock, UserMinus } from "lucide-react";

interface TicketActionsProps {
  ticketId: string;
  currentStatus: string;
  isAssigned: boolean;
}

export function ClaimTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to claim ticket");
      }

      router.refresh();
      toast.success("Ticket claimed successfully");
    } catch (error) {
      console.error("Error claiming ticket:", error);
      toast.error("Failed to claim ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50"
    >
      <UserPlus className="w-4 h-4" />
      {loading ? "Claiming..." : "Claim Ticket"}
    </button>
  );
}

export function UnclaimTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUnclaim = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to unclaim ticket");
      }

      router.refresh();
      toast.success("Ticket unclaimed successfully");
    } catch (error) {
      console.error("Error unclaiming ticket:", error);
      toast.error("Failed to unclaim ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUnclaim}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
    >
      <UserMinus className="w-4 h-4" />
      {loading ? "Unclaiming..." : "Unclaim Ticket"}
    </button>
  );
}

export function UpdateStatusButton({ ticketId, currentStatus }: { ticketId: string; currentStatus: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setOpen(false);
      router.refresh();
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
          <Clock className="w-4 h-4" />
          Update Status
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Ticket Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResolveTicketDialog({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState("");
  const [closeTicket, setCloseTicket] = useState(false);

  const handleResolve = async () => {
    if (!resolution.trim()) {
      toast.error("Please provide a resolution summary");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, closeTicket }),
      });

      if (!response.ok) {
        throw new Error("Failed to resolve ticket");
      }

      setOpen(false);
      router.refresh();
      toast.success(closeTicket ? "Ticket closed" : "Ticket resolved");
    } catch (error) {
      console.error("Error resolving ticket:", error);
      toast.error("Failed to resolve ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors">
          <CheckCircle className="w-4 h-4" />
          Resolve
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Resolve Ticket</DialogTitle>
          <DialogDescription>
            Provide a summary of how this ticket was resolved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution Summary *</Label>
            <Textarea
              id="resolution"
              placeholder="Describe how this issue was resolved..."
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={closeTicket}
              onChange={(e) => setCloseTicket(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            Close ticket (mark as fully completed)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={loading || !resolution.trim()}>
              {loading ? "Resolving..." : closeTicket ? "Close Ticket" : "Mark Resolved"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TicketActions({ ticketId, currentStatus, isAssigned }: TicketActionsProps) {
  const showClaim = !isAssigned && currentStatus === "open";
  const showUnclaim = isAssigned && currentStatus !== "resolved" && currentStatus !== "closed";
  const showResolve = currentStatus !== "resolved" && currentStatus !== "closed";

  return (
    <div className="flex items-center gap-2">
      {showClaim && <ClaimTicketButton ticketId={ticketId} />}
      {showUnclaim && <UnclaimTicketButton ticketId={ticketId} />}
      <UpdateStatusButton ticketId={ticketId} currentStatus={currentStatus} />
      {showResolve && <ResolveTicketDialog ticketId={ticketId} />}
    </div>
  );
}
