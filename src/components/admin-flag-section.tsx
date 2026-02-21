"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, Flag, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface FlagData {
  id: string;
  message: string;
  type: string;
  createdAt: string;
}

interface AdminFlagSectionProps {
  flags: FlagData[];
  projectId: string;
}

export function AdminFlagSection({ flags, projectId }: AdminFlagSectionProps) {
  const router = useRouter();
  const [resolving, setResolving] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  if (flags.length === 0 && !createOpen) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="rounded-full text-xs"
        >
          <Flag className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
          Request Client Input
        </Button>
        <CreateFlagDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          message={message}
          setMessage={setMessage}
          creating={creating}
          setCreating={setCreating}
          router={router}
        />
      </div>
    );
  }

  const handleResolve = async (flagId: string) => {
    setResolving(flagId);
    try {
      const res = await fetch(`/api/projects/${projectId}/flags/${flagId}`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve flag");
      }
      toast.success("Flag resolved");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResolving(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-amber-800">
            {flags.length} unresolved flag{flags.length > 1 ? "s" : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="rounded-full text-xs"
          >
            <Flag className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Request Client Input
          </Button>
        </div>
        {flags.map((flag) => (
          <div
            key={flag.id}
            className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 mb-0.5">
                {flag.type === "client_blocker" ? "Client Blocker" : "Input Requested"}
              </p>
              <p className="text-sm text-amber-700">{flag.message}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => handleResolve(flag.id)}
              disabled={resolving === flag.id}
            >
              {resolving === flag.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              )}
              Resolve
            </Button>
          </div>
        ))}
      </div>

      <CreateFlagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        message={message}
        setMessage={setMessage}
        creating={creating}
        setCreating={setCreating}
        router={router}
      />
    </>
  );
}

function CreateFlagDialog({
  open,
  onOpenChange,
  projectId,
  message,
  setMessage,
  creating,
  setCreating,
  router,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  message: string;
  setMessage: (msg: string) => void;
  creating: boolean;
  setCreating: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const handleCreate = async () => {
    if (!message.trim()) {
      toast.error("Please describe what you need from the client.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "client_input_needed", message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create flag");
      }
      toast.success("Flag created — client will see this on their project page.");
      onOpenChange(false);
      setMessage("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Client Input</DialogTitle>
          <DialogDescription>
            The client will see this as an action banner on their project page.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
            What do you need from the client?
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Please upload your employee CSV export..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-[#7C1CFF] resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !message.trim()}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to Client
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
