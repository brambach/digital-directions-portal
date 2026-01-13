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
      setOpen(false);
      router.refresh();
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
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2 shadow-sm text-sm font-medium">
          <UserPlus className="w-4 h-4" strokeWidth={1.5} />
          <span>Invite User</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite User to {companyName}</DialogTitle>
          <DialogDescription>
            Send a portal invite to another person from {companyName}. They'll get access to all projects and files for this client.
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
            <p className="text-xs text-gray-500">
              They'll receive an email with a signup link that expires in 7 days.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
