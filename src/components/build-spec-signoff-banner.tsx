"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface BuildSpecSignoff {
  id: string;
  documentSnapshot: string | null;
  signedByClient: string | null;
  signedAt: string | null;
  clientConfirmText?: string | null;
  createdAt: string;
}

interface BuildSpecSignoffBannerProps {
  projectId: string;
  signoff: BuildSpecSignoff;
}

export function BuildSpecSignoffBanner({ projectId, signoff }: BuildSpecSignoffBannerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const isSigned = !!signoff.signedAt;

  const handleSignOff = async () => {
    if (!agreed) {
      toast.error("Please confirm you have read and agree to the build specification");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/signoffs/${signoff.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientConfirmText: "I have reviewed and approve the build specification.",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sign off");
      }
      toast.success("Build spec signed — thank you!");
      setModalOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (isSigned) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800">Build Spec Signed Off</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Signed on {format(new Date(signoff.signedAt!), "d MMM yyyy")} · Awaiting UAT stage
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ClipboardCheck className="w-4 h-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-800 mb-0.5">
              Action Required: Sign Off on Build Spec
            </p>
            <p className="text-sm text-violet-700">
              The Digital Directions team has completed the integration build. Please review the
              build specification below and provide your sign-off to proceed to UAT.
            </p>
          </div>
        </div>

        {/* Spec preview toggle */}
        <div className="border border-violet-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>View Build Specification</span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {expanded && (
            <div className="px-4 py-3 bg-white border-t border-violet-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {signoff.documentSnapshot ?? "No content available."}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="rounded-full"
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Review &amp; Sign Off
          </Button>
        </div>
      </div>

      {/* Sign-off Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#7C1CFF]" />
              Sign Off: Build Specification
            </DialogTitle>
            <DialogDescription>
              Please review the build specification below, then confirm your sign-off. This
              indicates your approval to proceed to UAT.
            </DialogDescription>
          </DialogHeader>

          {/* Spec content */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto my-2">
            {signoff.documentSnapshot ?? "No content available."}
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-300 accent-[#7C1CFF] cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              I have read and understood the Build Specification above, and I approve the
              integration as described. I understand this confirms that the build is ready for
              User Acceptance Testing.
            </span>
          </label>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={signing}>
              Cancel
            </Button>
            <Button onClick={handleSignOff} disabled={signing || !agreed}>
              {signing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirm Sign-Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
