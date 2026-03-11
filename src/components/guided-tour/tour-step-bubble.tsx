"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DigiMascot } from "@/components/digi-mascot";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tour-steps";

const TYPEWRITER_SPEED_MS = 18; // ms per character

interface TourStepBubbleProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

type Placement = "below" | "above" | "left" | "right";

function computePosition(
  targetRect: DOMRect | null,
  bubbleWidth: number,
  bubbleHeight: number,
): { top: number; left: number; placement: Placement } {
  // Centred steps (no target)
  if (!targetRect) {
    return {
      top: Math.max(0, (window.innerHeight - bubbleHeight) / 2),
      left: Math.max(0, (window.innerWidth - bubbleWidth) / 2),
      placement: "below",
    };
  }

  const pad = 16; // gap between target and bubble
  const margin = 12; // viewport edge margin
  const spaceBelow = window.innerHeight - targetRect.bottom - pad;
  const spaceAbove = targetRect.top - pad;
  const spaceRight = window.innerWidth - targetRect.right - pad;
  const spaceLeft = targetRect.left - pad;

  let placement: Placement = "below";
  let top = 0;
  let left = 0;

  // Prefer below, then above, then right, then left
  if (spaceBelow >= bubbleHeight) {
    placement = "below";
    top = targetRect.bottom + pad;
    left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
  } else if (spaceAbove >= bubbleHeight) {
    placement = "above";
    top = targetRect.top - pad - bubbleHeight;
    left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
  } else if (spaceRight >= bubbleWidth) {
    placement = "right";
    top = targetRect.top + targetRect.height / 2 - bubbleHeight / 2;
    left = targetRect.right + pad;
  } else if (spaceLeft >= bubbleWidth) {
    placement = "left";
    top = targetRect.top + targetRect.height / 2 - bubbleHeight / 2;
    left = targetRect.left - pad - bubbleWidth;
  } else {
    // Fallback: below anyway
    placement = "below";
    top = targetRect.bottom + pad;
    left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
  }

  // Clamp to viewport
  top = Math.max(margin, Math.min(top, window.innerHeight - bubbleHeight - margin));
  left = Math.max(margin, Math.min(left, window.innerWidth - bubbleWidth - margin));

  return { top, left, placement };
}

function TailPointer({
  placement,
  targetRect,
  bubbleLeft,
  bubbleTop,
  bubbleWidth,
  bubbleHeight,
}: {
  placement: Placement;
  targetRect: DOMRect | null;
  bubbleLeft: number;
  bubbleTop: number;
  bubbleWidth: number;
  bubbleHeight: number;
}) {
  if (!targetRect) return null;

  const size = 8;
  let style: React.CSSProperties = {};

  if (placement === "below") {
    const cx = targetRect.left + targetRect.width / 2 - bubbleLeft;
    const clamped = Math.max(20, Math.min(cx, bubbleWidth - 20));
    style = {
      position: "absolute",
      top: -size,
      left: clamped - size,
      width: 0,
      height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderBottom: `${size}px solid white`,
    };
  } else if (placement === "above") {
    const cx = targetRect.left + targetRect.width / 2 - bubbleLeft;
    const clamped = Math.max(20, Math.min(cx, bubbleWidth - 20));
    style = {
      position: "absolute",
      bottom: -size,
      left: clamped - size,
      width: 0,
      height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderTop: `${size}px solid white`,
    };
  } else if (placement === "right") {
    const cy = targetRect.top + targetRect.height / 2 - bubbleTop;
    const clamped = Math.max(20, Math.min(cy, bubbleHeight - 20));
    style = {
      position: "absolute",
      left: -size,
      top: clamped - size,
      width: 0,
      height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderRight: `${size}px solid white`,
    };
  } else if (placement === "left") {
    const cy = targetRect.top + targetRect.height / 2 - bubbleTop;
    const clamped = Math.max(20, Math.min(cy, bubbleHeight - 20));
    style = {
      position: "absolute",
      right: -size,
      top: clamped - size,
      width: 0,
      height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderLeft: `${size}px solid white`,
    };
  }

  return <div style={style} />;
}

export function TourStepBubble({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: TourStepBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: Placement }>({
    top: 0,
    left: 0,
    placement: "below",
  });
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const reposition = useCallback(() => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const result = computePosition(targetRect, rect.width, rect.height);
    setPos(result);
  }, [targetRect]);

  // Position on mount and when target changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => reposition());
    return () => cancelAnimationFrame(raf);
  }, [reposition, stepIndex]);

  // Auto-focus the primary button
  useEffect(() => {
    const timer = setTimeout(() => primaryRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  // Typewriter effect — restarts on each step, pauses while hovered
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedMessage("");
    setIsTyping(true);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayedMessage(step.message.slice(0, i));
      if (i >= step.message.length) {
        clearInterval(intervalRef.current!);
        setIsTyping(false);
      }
    }, TYPEWRITER_SPEED_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step.message, stepIndex]);

  const handleNext = () => {
    if (isTyping) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayedMessage(step.message);
      setIsTyping(false);
      return;
    }
    onNext();
  };

  const handleBack = () => {
    if (isTyping) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayedMessage(step.message);
      setIsTyping(false);
      return;
    }
    onBack();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        ref={bubbleRef}
        role="dialog"
        aria-modal="true"
        aria-label={step.title || `Tour step ${stepIndex + 1}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="absolute z-10 w-[340px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl pointer-events-auto"
        style={{ top: pos.top, left: pos.left }}
      >
        <TailPointer
          placement={pos.placement}
          targetRect={targetRect}
          bubbleLeft={pos.left}
          bubbleTop={pos.top}
          bubbleWidth={bubbleRef.current?.getBoundingClientRect().width ?? 340}
          bubbleHeight={bubbleRef.current?.getBoundingClientRect().height ?? 200}
        />

        <div className="p-5">
          {/* Digi + text */}
          <div className="flex items-start gap-3 mb-4">
            <DigiMascot variant={step.digiVariant} size="xs" className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {step.title && (
                <h3 className="text-[14px] font-bold text-slate-800 mb-1">{step.title}</h3>
              )}
              <p className="text-[13px] text-slate-600 leading-relaxed">{displayedMessage}</p>
            </div>
          </div>

          {/* Bottom row: dots + buttons */}
          <div className="flex items-center justify-between">
            {/* Step dots + counter */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === stepIndex ? "bg-violet-500" : "bg-violet-200"
                  }`}
                />
              ))}
              <span className="text-[11px] text-slate-400 ml-1 tabular-nums">
                {stepIndex + 1} / {totalSteps}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs h-8 px-3">
                  Back
                </Button>
              )}
              {!isLast && (
                <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs h-8 px-3 text-slate-400">
                  Skip
                </Button>
              )}
              <Button
                ref={primaryRef}
                size="sm"
                onClick={isLast ? onFinish : handleNext}
                className="text-xs h-8 px-4 rounded-full"
              >
                {isLast ? "Got it!" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
