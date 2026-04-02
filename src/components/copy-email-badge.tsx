"use client";

import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";

export function CopyEmailBadge({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-violet-50 border border-violet-100">
      <Mail className="w-3 h-3 text-[#7C1CFF] flex-shrink-0" />
      <span className="text-[12px] font-bold text-[#7C1CFF] font-mono">{email}</span>
      <button
        onClick={handleCopy}
        className="ml-1 p-1 rounded-full hover:bg-violet-100 transition-colors"
        title="Copy email"
      >
        {copied
          ? <Check className="w-3 h-3 text-emerald-500" />
          : <Copy className="w-3 h-3 text-[#7C1CFF] opacity-60 hover:opacity-100" />
        }
      </button>
    </div>
  );
}
