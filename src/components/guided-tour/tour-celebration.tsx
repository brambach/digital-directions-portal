"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { DigiMascot } from "@/components/digi-mascot";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface TourCelebrationProps {
  onDismiss: () => void;
}

export function TourCelebration({ onDismiss }: TourCelebrationProps) {
  const confettiFired = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!confettiFired.current) {
      confettiFired.current = true;

      // Centre burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7C1CFF", "#A855F7", "#C084FC", "#10B981", "#F59E0B"],
      });

      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 35,
          angle: 60,
          spread: 50,
          origin: { x: 0, y: 0.65 },
          colors: ["#7C1CFF", "#A855F7", "#C084FC"],
        });
        confetti({
          particleCount: 35,
          angle: 120,
          spread: 50,
          origin: { x: 1, y: 0.65 },
          colors: ["#10B981", "#34D399", "#6EE7B7"],
        });
      }, 350);
    }

    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 p-8 text-center space-y-5 animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <DigiMascot variant="celebrating" size="lg" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Welcome aboard!
          </h2>
          <p className="text-sm text-slate-500">
            You&apos;re all set to explore the portal. Jump in whenever you&apos;re ready.
          </p>
        </div>

        <Button
          className="w-full rounded-full font-semibold"
          onClick={() => {
            router.push("/dashboard/client/projects");
            onDismiss();
          }}
        >
          Explore your projects
        </Button>

        <p className="text-xs text-slate-400">Click anywhere to dismiss</p>
      </div>
    </div>
  );
}
