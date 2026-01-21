"use client";

import { cn } from "@/lib/utils";

interface ContactTeamButtonProps {
  className?: string;
}

export function ContactTeamButton({ className }: ContactTeamButtonProps) {
  const handleClick = () => {
    // Find the message form textarea
    const messageForm = document.querySelector("textarea[placeholder=\"Type a message...\"]");
    if (messageForm) {
      // Scroll to the message form
      messageForm.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus the textarea after a short delay to allow scroll to complete
      setTimeout(() => {
        (messageForm as HTMLTextAreaElement).focus();
      }, 500);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm",
        className
      )}
    >
      Contact Team
    </button>
  );
}
