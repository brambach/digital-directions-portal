"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TicketCommentFormProps {
  ticketId: string;
  isAdmin?: boolean;
}

export function TicketCommentForm({ ticketId, isAdmin = false }: TicketCommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isInternal }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      setContent("");
      setIsInternal(false);
      router.refresh();
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
      <textarea
        placeholder="Add a comment..."
        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-slate-900 placeholder:text-slate-400"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
      />

      <div className="flex items-center justify-between mt-3">
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-slate-300 text-purple-700 focus:ring-purple-600"
            />
            Internal note (client won&apos;t see this)
          </label>
        )}
        {!isAdmin && <div />}

        <button
          type="submit"
          className="bg-gray-900 text-white px-5 py-2 rounded-lg transition-all hover:bg-gray-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          disabled={loading || !content.trim()}
        >
          {loading ? "Sending..." : "Add Comment"}
        </button>
      </div>
    </form>
  );
}
