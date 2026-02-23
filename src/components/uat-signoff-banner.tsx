"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle, Loader2 } from "lucide-react";
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

interface UatSignoff {
  id: string;
  documentSnapshot: string | null;
  signedByClient: string | null;
  signedAt: string | null;
  clientConfirmText?: string | null;
  ddCounterSignedAt?: string | null;
  createdAt: string;
}

interface UatSignoffBannerProps {
  projectId: string;
  signoff: UatSignoff;
}

export function UatSignoffBanner({ projectId, signoff }: UatSignoffBannerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const isSigned = !!signoff.signedAt;

  const handleSignOff = async () => {
    if (!agreed) {
      toast.error("Please confirm you have tested all scenarios");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/signoffs/${signoff.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientConfirmText:
            "I confirm I have tested all UAT scenarios and approve the integration for go-live.",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sign off");
      }
      toast.success("UAT signed off — thank you!");
      setModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
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
          <p className="text-sm font-semibold text-emerald-800">UAT Signed Off</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Signed on {format(new Date(signoff.signedAt!), "d MMM yyyy")}
            {signoff.ddCounterSignedAt &&
              ` · Counter-signed ${format(new Date(signoff.ddCounterSignedAt), "d MMM yyyy")}`}
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
              Action Required: Sign Off on UAT
            </p>
            <p className="text-sm text-violet-700">
              Your UAT results have been approved by the Digital Directions team. Please
              confirm your sign-off to proceed to Go-Live.
            </p>
          </div>
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
              Sign Off: UAT Testing
            </DialogTitle>
            <DialogDescription>
              Please confirm that you have tested all UAT scenarios and approve the
              integration for go-live.
            </DialogDescription>
          </DialogHeader>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none mt-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-300 accent-[#7C1CFF] cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              I confirm I have tested all UAT scenarios and approve the integration for
              go-live. I understand that signing off indicates the integration has been
              verified and is ready for production.
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
