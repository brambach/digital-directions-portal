"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ClientFlagButtonProps {
  projectId: string;
  className?: string;
}

export function ClientFlagButton({ projectId, className }: ClientFlagButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please describe the issue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "client_blocker", message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to raise flag");
      }

      toast.success("Flag raised — our team has been notified.");
      setOpen(false);
      setMessage("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <Flag className="w-4 h-4 mr-2 text-amber-500" />
        Raise a Flag
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raise a Flag</DialogTitle>
            <DialogDescription>
              Let our team know if something is blocking you or you need guidance.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
              What&apos;s going on?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what's blocking you or what you need help with..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-[#7C1CFF] resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Raise Flag
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
