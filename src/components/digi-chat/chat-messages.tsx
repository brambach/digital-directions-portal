"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/chat/types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

function formatContent(content: string) {
  // Split into lines for processing
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
  // Bold: **text**
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
      {/* Welcome message */}
      <div className="flex gap-2.5 items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/digi/digi_neutral.png"
          alt="Digi"
          className="w-7 h-7 object-contain flex-shrink-0 mt-0.5"
          draggable={false}
        />
        <div className="bg-slate-50 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-slate-700 leading-relaxed max-w-[85%]">
          Hi! I&apos;m Digi, your Digital Directions support assistant. I can
          help with questions about your HiBob integration, the portal, or your
          project progress. What can I help you with?
        </div>
      </div>

      {/* Messages */}
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex gap-2.5 items-start ${msg.role === "user" ? "justify-end" : ""}`}
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
          <div
            className={
              msg.role === "user"
                ? "bg-[#7C1CFF] text-white rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[85%]"
                : "bg-slate-50 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-slate-700 leading-relaxed max-w-[85%]"
            }
          >
            {msg.role === "assistant" ? formatContent(msg.content) : msg.content}
          </div>
        </div>
      ))}

      {/* Streaming indicator */}
      {isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-2.5 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/digi/digi_neutral.png"
              alt="Digi"
              className="w-7 h-7 object-contain flex-shrink-0 mt-0.5"
              draggable={false}
            />
            <div
              className="bg-slate-50 rounded-2xl rounded-tl-md px-3.5 py-2.5"
              role="status"
              aria-label="Digi is typing"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

      <div ref={scrollRef} />
    </div>
  );
}
