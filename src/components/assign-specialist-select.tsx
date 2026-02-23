"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, UserCircle2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface AssignSpecialistSelectProps {
  projectId: string;
  admins: AdminUser[];
  /** Current selected specialist user IDs */
  selectedIds: string[];
}

export function AssignSpecialistSelect({
  projectId,
  admins,
  selectedIds: initialIds,
}: AssignSpecialistSelectProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  const toggle = async (userId: string) => {
    const next = selectedIds.includes(userId)
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedSpecialists: next }),
      });
      if (!res.ok) throw new Error("Failed to update specialists");
      setSelectedIds(next);
      router.refresh();
    } catch {
      toast.error("Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedSpecialists: [] }),
      });
      if (!res.ok) throw new Error("Failed to clear specialists");
      setSelectedIds([]);
      toast.success("Specialists unassigned");
      router.refresh();
    } catch {
      toast.error("Failed to clear assignment");
    } finally {
      setSaving(false);
    }
  };

  const label =
    selectedIds.length === 0
      ? "Assign specialist"
      : selectedIds.length === 1
      ? (admins.find((a) => a.id === selectedIds[0])?.name ?? "1 specialist")
      : `${selectedIds.length} specialists`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          className="rounded-full text-xs font-semibold h-8 gap-1.5 max-w-[200px]"
        >
          <UserCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {admins.map((admin) => {
          const checked = selectedIds.includes(admin.id);
          return (
            <DropdownMenuItem
              key={admin.id}
              onClick={() => toggle(admin.id)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className={
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 " +
                  (checked
                    ? "bg-[#7C1CFF] border-[#7C1CFF]"
                    : "border-slate-300")
                }
              >
                {checked && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="flex-1 text-sm">{admin.name}</span>
            </DropdownMenuItem>
          );
        })}
        {selectedIds.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={clearAll}
              className="text-slate-500 text-xs gap-1.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Clear all
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
