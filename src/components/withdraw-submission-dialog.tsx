"use client";

import { Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WithdrawSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  stageName: string;
}

export function WithdrawSubmissionDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  stageName,
}: WithdrawSubmissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Submission</DialogTitle>
          <DialogDescription>
            This will withdraw your {stageName} submission and return it to draft
            mode. You can make changes and resubmit when ready.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Withdrawing...
              </>
            ) : (
              <>
                <Undo2 className="w-4 h-4 mr-2" />
                Withdraw Submission
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
