"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/chat/types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

function formatContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="list-disc list-inside space-y-0.5 my-1"
        >
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[\-\*]\s+(.+)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
    } else {
      flushList();
      if (line.trim() === "") {
        elements.push(<br key={`br-${i}`} />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="my-0.5">
            {formatInline(line)}
          </p>
        );
      }
    }
  }
  flushList();

  return elements;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={i} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
    }
    return part;
  });
}

function timeAgo(index: number, total: number): string {
  if (index >= total - 2) return "just now";
  const minutesAgo = Math.floor((total - index) / 2);
  if (minutesAgo <= 1) return "1m ago";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  return `${Math.floor(minutesAgo / 60)}h ago`;
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      role="log"
      aria-live="polite"
    >
      {/* Welcome state — larger illustration before any messages */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/digi/digi_neutral.png"
            alt="Digi"
            className="w-20 h-[108px] object-contain mb-4"
            draggable={false}
          />
          <p className="text-sm font-semibold text-slate-800 mb-1">
            Hey there! I&apos;m Digi
          </p>
          <p className="text-[13px] text-slate-500 text-center leading-relaxed max-w-[280px]">
            Your Digital Directions support assistant. Ask me about your project,
            the portal, or your HiBob integration.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <span className="px-2.5 py-1 bg-violet-50 text-violet-600 rounded-full text-[11px] font-medium">
              Project status
            </span>
            <span className="px-2.5 py-1 bg-violet-50 text-violet-600 rounded-full text-[11px] font-medium">
              Integration help
            </span>
            <span className="px-2.5 py-1 bg-violet-50 text-violet-600 rounded-full text-[11px] font-medium">
              Portal guide
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex gap-2.5 items-start ${msg.role === "user" ? "justify-end" : ""} animate-in fade-in slide-in-from-bottom-1 duration-200`}
        >
          {msg.role === "assistant" && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/images/digi/digi_neutral.png"
              alt="Digi"
              className="w-7 h-7 object-contain flex-shrink-0 mt-0.5"
              draggable={false}
            />
          )}
          <div className="flex flex-col gap-0.5 max-w-[85%]">
            <div
              className={
                msg.role === "user"
                  ? "bg-gradient-to-br from-[#7C1CFF] to-[#6316CC] text-white rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm"
                  : "bg-violet-50/50 border border-violet-100/50 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-slate-700 leading-relaxed"
              }
            >
              {msg.role === "assistant"
                ? formatContent(msg.content)
                : msg.content}
            </div>
            {/* Timestamp */}
            <span
              className={`text-[10px] text-slate-300 ${msg.role === "user" ? "text-right" : "ml-0.5"}`}
            >
              {timeAgo(i, messages.length)}
            </span>
          </div>
        </div>
      ))}

      {/* Streaming shimmer indicator */}
      {isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-2.5 items-start animate-in fade-in duration-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/digi/digi_neutral.png"
              alt="Digi"
              className="w-7 h-7 object-contain flex-shrink-0 mt-0.5"
              draggable={false}
            />
            <div
              className="bg-violet-50/50 border border-violet-100/50 rounded-2xl rounded-tl-md px-4 py-3"
              role="status"
              aria-label="Digi is typing"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-violet-300 rounded-full animate-[pulse_1.4s_ease-in-out_infinite]" />
                <span className="w-1.5 h-1.5 bg-violet-300 rounded-full animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
                <span className="w-1.5 h-1.5 bg-violet-300 rounded-full animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
              </div>
            </div>
          </div>
        )}

      <div ref={scrollRef} />
    </div>
  );
}
