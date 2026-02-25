"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function OpenDigiButton() {
  return (
    <Button
      className="rounded-full font-semibold px-6 gap-2"
      onClick={() => window.dispatchEvent(new Event("digi:open"))}
    >
      <MessageCircle className="w-4 h-4" />
      Ask Digi
    </Button>
  );
}
