import { cn } from "@/lib/utils";

// Variants map to actual filenames in /public/images/digi/
const VARIANTS = {
  neutral:      "/images/digi/digi_neutral.png",
  construction: "/images/digi/digi_construction.png",
  celebrating:  "/images/digi/digi_celebrating.png",
  confused:     "/images/digi/digi_confused.png",
  sleeping:     "/images/digi/digi_sleeping.png",
} as const;

export type DigiVariant = keyof typeof VARIANTS;

const SIZES = {
  xs:  { px: 48,  cls: "w-12"  },
  sm:  { px: 80,  cls: "w-20"  },
  md:  { px: 120, cls: "w-28"  },
  lg:  { px: 180, cls: "w-44"  },
  xl:  { px: 240, cls: "w-60"  },
} as const;

export type DigiSize = keyof typeof SIZES;

interface DigiMascotProps {
  variant?: DigiVariant;
  size?: DigiSize;
  className?: string;
  alt?: string;
}

export function DigiMascot({
  variant = "neutral",
  size = "md",
  className,
  alt,
}: DigiMascotProps) {
  const src = VARIANTS[variant];
  const { px, cls } = SIZES[size];
  const altText = alt ?? `Digi the bear — ${variant}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={altText}
      width={px}
      height={Math.round(px * 1.35)}
      className={cn(cls, "object-contain select-none", className)}
      draggable={false}
    />
  );
}
