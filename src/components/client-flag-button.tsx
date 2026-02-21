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

const FLAG_TYPES = [
  {
    value: "client_blocker",
    label: "Something is blocked",
    description: "I can't proceed because something is preventing progress.",
  },
  {
    value: "client_input_needed",
    label: "I need guidance",
    description: "I'm unsure about something and need direction from the DD team.",
  },
] as const;

export function ClientFlagButton({ projectId, className }: ClientFlagButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("client_blocker");
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
        body: JSON.stringify({ type, message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to raise flag");
      }

      toast.success("Flag raised — our team has been notified.");
      setOpen(false);
      setMessage("");
      setType("client_blocker");
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

          <div className="space-y-4 py-2">
            {/* Type selector */}
            <div className="space-y-2">
              {FLAG_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setType(ft.value)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    type === ft.value
                      ? "border-[#7C1CFF] bg-violet-50"
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {ft.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ft.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                What&apos;s going on?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue or what you need help with..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-[#7C1CFF] resize-none"
              />
            </div>
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
