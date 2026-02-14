"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MessageForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setContent("");
      router.refresh();
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        placeholder="Type a message..."
        className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 text-gray-900 placeholder:text-gray-400"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-gray-900 text-white px-5 py-2 rounded-xl transition-all hover:bg-gray-800 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          disabled={loading || !content.trim()}
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}
