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
import { GlowButton } from "@/components/glow-button";

export function InviteTeamMemberDialog() {
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
          role: "admin",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invite");
      }

      setEmail("");
      setOpen(false);
      router.refresh();
      toast.success(`Invite sent to ${email}`);
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GlowButton>
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </GlowButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Invite Team Member</DialogTitle>
          <DialogDescription className="text-slate-500">
            Send an invitation to join your team as an admin. They&apos;ll receive an email with a signup link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              They&apos;ll be able to manage clients, projects, and provide support.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-full transition-colors border border-slate-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
