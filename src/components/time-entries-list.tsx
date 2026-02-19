"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Trash2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Image from "next/image";

interface TimeEntry {
  id: string;
  minutes: number;
  hours: number;
  description: string | null;
  loggedAt: string;
  countTowardsSupportHours: boolean;
  userClerkId: string | null;
  userRole: string | null;
}

interface TimeEntriesListProps {
  ticketId: string;
  onUpdate?: () => void;
}

export function TimeEntriesList({ ticketId, onUpdate }: TimeEntriesListProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/time`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setTotalHours(data.totalHours);
      }
    } catch (error) {
      console.error("Error fetching time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) {
      return;
    }

    setDeletingId(entryId);
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/time/${entryId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete time entry");
      }

      toast.success("Time entry deleted");
      fetchEntries();
      onUpdate?.();
      router.refresh();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      toast.error("Failed to delete time entry");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-slate-100 rounded-lg"></div>
        <div className="h-20 bg-slate-100 rounded-lg"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-slate-500 text-sm">No time logged yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Time Header */}
      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-700" />
            <span className="text-sm font-medium text-purple-900">Total Time Logged</span>
          </div>
          <span className="text-2xl font-bold text-purple-900">{totalHours}h</span>
        </div>
      </div>

      {/* Time Entries */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-lg p-4 border border-slate-100 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200">
                      <User className="w-3.5 h-3.5 text-purple-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {entry.userRole === "admin" ? "Team Member" : "User"}
                    </span>
                  </div>

                  <span className="text-lg font-semibold text-slate-900">
                    {entry.hours}h
                  </span>

                  {entry.countTowardsSupportHours && (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                      Support Hours
                    </span>
                  )}
                </div>

                {entry.description && (
                  <p className="text-sm text-slate-600 mb-2">{entry.description}</p>
                )}

                <p className="text-xs text-slate-400">
                  Logged {formatDistanceToNow(new Date(entry.loggedAt), { addSuffix: true })}
                </p>
              </div>

              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
