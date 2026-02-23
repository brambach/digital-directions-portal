"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2 } from "lucide-react";
import { stageLabel, nextStage, stageSlug } from "@/lib/lifecycle";

interface StageAdvanceButtonProps {
  projectId: string;
  currentStage: string;
}

export function StageAdvanceButton({ projectId, currentStage }: StageAdvanceButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const next = nextStage(currentStage);
  if (!next) return null;

  const handleAdvance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to advance stage");
      }
      toast.success(`Advanced to ${stageLabel(next)}`);
      const slug = stageSlug(next);
      if (slug) {
        router.push(`/dashboard/admin/projects/${projectId}/${slug}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleAdvance} disabled={loading} className="rounded-xl font-semibold shadow-sm">
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ChevronRight className="w-4 h-4 mr-2" />
      )}
      Move to {stageLabel(next)}
    </Button>
  );
}
