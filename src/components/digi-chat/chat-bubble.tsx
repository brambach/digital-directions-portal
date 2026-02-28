"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatBubble({ isOpen, onClick }: ChatBubbleProps) {
  const [mounted, setMounted] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Show prompt bubble after a short delay, unless user has already seen/dismissed it
    const hasSeen = localStorage.getItem("digi-prompt-seen");
    if (!hasSeen) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  useEffect(() => {
    if (isOpen) {
      setShowPrompt(false);
      localStorage.setItem("digi-prompt-seen", "true");
    }
  }, [isOpen]);

  const dismissPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrompt(false);
    localStorage.setItem("digi-prompt-seen", "true");
  };

  return (
    <>
      {/* Thought bubble prompt */}
      {showPrompt && !isOpen && mounted && (
        <div
          className={cn(
            "fixed z-[9997] animate-in fade-in slide-in-from-bottom-2 duration-500",
            "bottom-[5.75rem] right-6",
          )}
        >
          <div className="relative bg-white rounded-2xl px-3.5 py-2.5 shadow-lg border border-slate-100">
            <span className="text-[13px] font-semibold text-slate-600 whitespace-nowrap pr-5">
              Got a question? Ask Digi
            </span>
            <button
              onClick={dismissPrompt}
              className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
            {/* Tail pointing down toward button */}
            <div className="absolute -bottom-1.5 right-[22px] w-3 h-3 bg-white border-b border-r border-slate-100 rotate-45" />
          </div>
        </div>
      )}

      {/* Chat button */}
      <button
        onClick={onClick}
        className={cn(
          "fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-[#7C1CFF] to-[#5B10BF] shadow-lg shadow-purple-500/25 hover:shadow-purple-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95",
          // Entrance animation
          mounted
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-50 translate-y-4",
        )}
        aria-label={isOpen ? "Close Digi chat" : "Chat with Digi"}
      >
        <span className={cn(
          "transition-all duration-300",
          isOpen ? "rotate-90 scale-100" : "rotate-0 scale-100"
        )}>
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/images/digi/digi_headset.png"
              alt="Digi"
              className="w-9 h-9 object-contain"
              draggable={false}
            />
          )}
        </span>
      </button>
    </>
  );
}
