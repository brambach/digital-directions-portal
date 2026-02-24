"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatBubble({ isOpen, onClick }: ChatBubbleProps) {
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen) setHasBeenOpened(true);
  }, [isOpen]);

  return (
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
      {/* Pulse ring — only shows before first open */}
      {!hasBeenOpened && !isOpen && mounted && (
        <span className="absolute inset-0 rounded-full bg-[#7C1CFF]/30 animate-ping" />
      )}

      <span className={cn(
        "transition-all duration-300",
        isOpen ? "rotate-90 scale-100" : "rotate-0 scale-100"
      )}>
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/images/digi/digi_neutral.png"
            alt="Digi"
            className="w-9 h-9 object-contain"
            draggable={false}
          />
        )}
      </span>
    </button>
  );
}
