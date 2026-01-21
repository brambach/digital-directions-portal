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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

interface InviteUserToClientDialogProps {
  clientId: string;
  companyName: string;
}

export function InviteUserToClientDialog({ clientId, companyName }: InviteUserToClientDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: "client",
          clientId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if it's a duplicate invite error
        if (result.error?.includes("already exists")) {
          toast.error(`${email} has already been invited. Check the "Pending Invites" section below to see who's waiting to sign up.`);
        } else if (result.error?.includes("Failed to send invite email")) {
          // Email sending failed - show user-friendly message
          toast.error(`Unable to send invite to ${email}. ${result.error.includes("verify a domain") ? "Please verify your domain in Resend to send emails." : result.error}`);
        } else {
          toast.error(result.error || "Failed to send invite");
        }
        throw new Error(result.error || "Failed to send invite");
      }

      // Success - email was sent and invite created
      toast.success(`Invite sent to ${email}! They'll receive an email with signup instructions.`);

      setEmail("");

      // Refresh the page data first, then close the dialog
      router.refresh();

      // Small delay to ensure the refresh completes before closing
      setTimeout(() => {
        setOpen(false);
      }, 100);
    } catch (error) {
      console.error("Error sending invite:", error);
      // Error already handled above with better messaging
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl font-semibold shadow-sm h-8">
          <UserPlus className="w-3.5 h-3.5 mr-2" strokeWidth={2.5} />
          <span>Invite User</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite User to {companyName}</DialogTitle>
          <DialogDescription>
            Send a portal invite to another person from {companyName}. They&apos;ll get access to all projects and files for this client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              They&apos;ll receive an email with a signup link that expires in 7 days.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
