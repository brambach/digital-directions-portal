"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, Flag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Flag {
  id: string;
  message: string;
  type: string;
  createdAt: string;
}

interface DdFlagBannerProps {
  flags: Flag[];
  projectId: string;
}

export function DdFlagBanner({ flags, projectId }: DdFlagBannerProps) {
  const router = useRouter();
  const [resolving, setResolving] = useState<string | null>(null);

  const inputNeededFlags = flags.filter((f) => f.type === "client_input_needed");
  const blockerFlags = flags.filter((f) => f.type === "client_blocker");

  if (inputNeededFlags.length === 0 && blockerFlags.length === 0) return null;

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
      toast.success("Flag resolved — thank you!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Admin-raised flags — client needs to act */}
      {inputNeededFlags.map((flag) => (
        <div
          key={flag.id}
          className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 mb-0.5">
              Action Needed
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
            I&apos;ve done this
          </Button>
        </div>
      ))}

      {/* Client-raised flags — waiting for DD team */}
      {blockerFlags.map((flag) => (
        <div
          key={flag.id}
          className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Flag className="w-4 h-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-800 mb-0.5">
              Flag Raised
            </p>
            <p className="text-sm text-violet-700">{flag.message}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-600 flex-shrink-0">
            <Clock className="w-3 h-3" />
            Awaiting response
          </span>
        </div>
      ))}
    </div>
  );
}
