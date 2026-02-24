"use client";

import { X } from "lucide-react";

interface ChatBubbleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatBubble({ isOpen, onClick }: ChatBubbleProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-[#7C1CFF] to-[#6316CC] shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
      aria-label={isOpen ? "Close Digi chat" : "Chat with Digi"}
    >
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
    </button>
  );
}
