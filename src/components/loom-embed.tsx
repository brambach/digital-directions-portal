"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoomEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

function extractVideoId(url: string): string | null {
  // Handle: https://www.loom.com/share/abc123 or https://loom.com/share/abc123?query
  const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export function LoomEmbed({ url, title, className }: LoomEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = extractVideoId(url);

  if (!videoId) {
    return (
      <div className={cn("rounded-2xl bg-slate-50 border border-slate-100 p-8 text-center", className)}>
        <p className="text-[13px] text-slate-500">Invalid Loom URL</p>
      </div>
    );
  }

  const embedUrl = `https://www.loom.com/embed/${videoId}?autoplay=1`;
  const thumbnailUrl = `https://cdn.loom.com/sessions/thumbnails/${videoId}-with-play.gif`;

  if (isPlaying) {
    return (
      <div className={cn("relative rounded-2xl overflow-hidden border border-slate-100 bg-black", className)}>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsPlaying(true)}
      className={cn(
        "relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-900 group cursor-pointer w-full text-left",
        className
      )}
    >
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        {/* Thumbnail */}
        <img
          src={thumbnailUrl}
          alt={title || "Loom video"}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          onError={(e) => {
            // If thumbnail fails, show a solid background
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-110 group-hover:bg-violet-500 transition-all duration-200">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>

        {/* Title */}
        {title && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white text-[13px] font-semibold truncate">{title}</p>
            <p className="text-white/60 text-[11px] mt-0.5">Click to play</p>
          </div>
        )}
      </div>
    </button>
  );
}
