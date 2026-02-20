"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { User, MessageSquare, Loader2 } from "lucide-react";
import Image from "next/image";
import { DijiMascot } from "@/components/diji-mascot";

interface Message {
  id: string;
  content: string;
  read: boolean;
  createdAt: Date;
  senderId: string | null;
  senderName: string;
  senderAvatar: string | null;
  senderRole: "admin" | "client" | null;
}

interface MessageListProps {
  projectId: string;
  initialMessages: Message[];
}

const MessageListComponent = ({ projectId, initialMessages }: MessageListProps) => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= 10);
  const [offset, setOffset] = useState(initialMessages.length);

  // Sync state when initialMessages changes (after router.refresh())
  useEffect(() => {
    setMessages(initialMessages);
    setOffset(initialMessages.length);
    setHasMore(initialMessages.length >= 10);
  }, [initialMessages]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/messages?projectId=${projectId}&limit=10&offset=${offset}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, ...data.messages]);
        setHasMore(data.pagination.hasMore);
        setOffset((prev) => prev + data.messages.length);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setLoading(false);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 flex flex-col items-center">
          <DijiMascot variant="neutral" size="sm" className="mb-4" />
          <h3 className="text-slate-800 font-bold text-base mb-2">Start a Conversation</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Send a message below to communicate with your project team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg divide-y divide-slate-100 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
        {messages.map((message) => (
          <div key={message.id} className="p-4">
            <div className="flex items-start gap-3">
              {message.senderAvatar ? (
                <Image
                  src={message.senderAvatar}
                  alt={message.senderName}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-900">{message.senderName}</span>
                  {message.senderRole === "admin" && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                      Team
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm text-purple-700 hover:text-purple-800 font-medium disabled:opacity-50 inline-flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Messages"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// Export memoized component for better performance
export const MessageList = memo(MessageListComponent);
