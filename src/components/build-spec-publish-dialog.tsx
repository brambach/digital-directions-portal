"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BuildSpecSignoff {
  id: string;
  documentSnapshot: string | null;
  signedByClient: string | null;
  signedAt: string | null;
  ddCounterSignedAt: string | null;
  createdAt: string;
}

interface BuildSpecPublishDialogProps {
  projectId: string;
  existingSignoff: BuildSpecSignoff | null;
}

export function BuildSpecPublishDialog({
  projectId,
  existingSignoff,
}: BuildSpecPublishDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(existingSignoff?.documentSnapshot ?? "");
  const [loading, setLoading] = useState(false);

  const isAlreadySigned = !!existingSignoff?.signedAt;
  const hasExisting = !!existingSignoff;

  const handlePublish = async () => {
    if (!content.trim()) {
      toast.error("Build spec content is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/signoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "build_spec", documentSnapshot: content.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish build spec");
      }
      toast.success("Build spec published — client has been notified to sign off");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If already signed, show a view-only state (no publish button)
  const buttonLabel = isAlreadySigned
    ? "View Build Spec"
    : hasExisting
    ? "Update Build Spec"
    : "Publish Build Spec";

  const buttonIcon = isAlreadySigned ? ClipboardCheck : hasExisting ? RefreshCw : Send;
  const ButtonIcon = buttonIcon;

  return (
    <>
      <Button
        size="sm"
        variant={hasExisting && !isAlreadySigned ? "outline" : "default"}
        onClick={() => {
          setContent(existingSignoff?.documentSnapshot ?? "");
          setOpen(true);
        }}
        className="rounded-full text-xs"
      >
        <ButtonIcon className="w-3.5 h-3.5 mr-1.5" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#7C1CFF]" />
              Build Specification
            </DialogTitle>
            <DialogDescription>
              {isAlreadySigned
                ? "This build spec has been signed off by the client."
                : hasExisting
                ? "Update and re-publish the build spec. The client will be notified of the update."
                : "Write the build specification summary. The client will be asked to review and sign off before UAT begins."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isAlreadySigned ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {existingSignoff?.documentSnapshot}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="spec-content">Build Spec Content</Label>
                <Textarea
                  id="spec-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Summarise what was built for the client. For example:\n\n## What We Built\n- Employee sync: HiBob → KeyPay (new hires, updates, terminations)\n- Leave sync: Annual Leave, Sick Leave\n- Pay categories mapped: 4 categories\n- Bank account sync: Up to 3 accounts\n\n## Test Data Used\n- 12 test employees\n- 2 payroll runs\n\n## Known Limitations\n- ...`}
                  rows={14}
                  className="resize-none font-mono text-xs"
                />
                <p className="text-xs text-slate-400">
                  Markdown formatting is supported. This document will be shown to the client for sign-off.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {isAlreadySigned ? "Close" : "Cancel"}
            </Button>
            {!isAlreadySigned && (
              <Button
                onClick={handlePublish}
                disabled={loading || !content.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {hasExisting ? "Update & Re-Publish" : "Publish for Sign-Off"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
