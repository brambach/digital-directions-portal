import Image from "next/image";
import { cn } from "@/lib/utils";

// Variants map to actual filenames in /public/images/digi/
// Note: digi_neutral.png is a duplicate — diji_neutral.png is the canonical file.
const VARIANTS = {
  neutral:      "/images/digi/diji_neutral.png",
  peeking:      "/images/digi/diji_peeking.png",
  construction: "/images/digi/diji_construction.png",
  celebrating:  "/images/digi/diji_celebrating.png",
  thinking:     "/images/digi/diji_thinking.png",
  confused:     "/images/digi/diji_confused.png",
  sleeping:     "/images/digi/diji_sleeping.png",
} as const;

export type DijiVariant = keyof typeof VARIANTS;

const SIZES = {
  xs:  { px: 48,  cls: "w-12"  },
  sm:  { px: 80,  cls: "w-20"  },
  md:  { px: 120, cls: "w-28"  },
  lg:  { px: 180, cls: "w-44"  },
  xl:  { px: 240, cls: "w-60"  },
} as const;

export type DijiSize = keyof typeof SIZES;

interface DijiMascotProps {
  variant?: DijiVariant;
  size?: DijiSize;
  className?: string;
  alt?: string;
}

export function DijiMascot({
  variant = "neutral",
  size = "md",
  className,
  alt,
}: DijiMascotProps) {
  const src = VARIANTS[variant];
  const { px, cls } = SIZES[size];
  const altText = alt ?? `Diji the bear — ${variant}`;

  return (
    <Image
      src={src}
      alt={altText}
      width={px}
      height={Math.round(px * 1.35)} // ~3:4 aspect ratio matches the character
      className={cn(cls, "object-contain select-none", className)}
      draggable={false}
    />
  );
}
