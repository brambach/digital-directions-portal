"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask Digi a question..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none no-scrollbar rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-50 bg-white overflow-y-auto"
          maxLength={2000}
          aria-label="Message to Digi"
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="rounded-full w-9 h-9 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
