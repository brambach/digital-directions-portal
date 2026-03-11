"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TOUR_STEPS, TOUR_LS_KEY } from "@/lib/tour-steps";
import { TourStepBubble } from "./tour-step-bubble";
import { TourCelebration } from "./tour-celebration";

interface TourOverlayProps {
  hasProjects?: boolean;
}

export function TourOverlay({ hasProjects = true }: TourOverlayProps) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // ── Adaptive steps: adjust stat-cards message if no projects yet ──
  const steps = useMemo(() => {
    if (hasProjects) return TOUR_STEPS;
    return TOUR_STEPS.map((s) =>
      s.id === "stat-cards"
        ? { ...s, message: "Once your project is set up, these cards will show your progress." }
        : s,
    );
  }, [hasProjects]);

  const [showCelebration, setShowCelebration] = useState(false);

  // ── Complete / dismiss ───────────────────────────────────────────
  const completeTour = useCallback((celebrate = false) => {
    localStorage.setItem(TOUR_LS_KEY, "true");
    setIsActive(false);
    setSpotlightRect(null);
    if (celebrate) setShowCelebration(true);
  }, []);

  // ── Immediate mount effect: suppress Digi prompt ──────────────────
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_LS_KEY);
    if (!completed) {
      // Write immediately to suppress the Digi chat prompt before its 100ms timer
      localStorage.setItem("digi-prompt-seen", "true");
    }
  }, []);

  // ── Start tour after delay (dashboard only) ──────────────────────
  useEffect(() => {
    if (pathname !== "/dashboard/client") return;

    const completed = localStorage.getItem(TOUR_LS_KEY);
    if (completed) return;

    const timer = setTimeout(() => {
      setIsActive(true);
      setCurrentStep(0);
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname]);

  // ── Dismiss if user navigates away mid-tour ──────────────────────
  useEffect(() => {
    if (isActive && pathname !== "/dashboard/client") {
      completeTour();
    }
  }, [pathname, isActive, completeTour]);

  // ── Measure target element rect ──────────────────────────────────
  const measureTarget = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex];
      if (!step || !step.target) {
        setSpotlightRect(null);
        return true; // centred step, always valid
      }

      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) return false; // target not found

      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      // Small delay to let scroll finish before measuring
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        setSpotlightRect(rect);
      });
      return true;
    },
    [steps],
  );

  // ── Navigate to a step, skipping missing targets ─────────────────
  const goToStep = useCallback(
    (index: number, direction: "forward" | "backward" = "forward") => {
      if (index < 0 || index >= steps.length) {
        completeTour();
        return;
      }

      const found = measureTarget(index);
      if (!found) {
        // Skip this step — target not in DOM
        const next = direction === "forward" ? index + 1 : index - 1;
        if (next < 0 || next >= steps.length) {
          completeTour();
          return;
        }
        goToStep(next, direction);
        return;
      }

      setCurrentStep(index);
    },
    [steps, measureTarget, completeTour],
  );

  // ── Element animations for specific steps ───────────────────────
  useEffect(() => {
    if (!isActive) return;
    const step = steps[currentStep];
    if (!step?.target) return;

    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;

    const animClass =
      step.id === "notification-bell" ? "tour-bell-ring" :
      step.id === "chat-bubble"       ? "tour-pop-pulse" : null;

    if (!animClass) return;
    el.classList.add(animClass);
    return () => el.classList.remove(animClass);
  }, [isActive, currentStep, steps]);

  // ── Measure on step change + resize ──────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    measureTarget(currentStep);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => measureTarget(currentStep), 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [isActive, currentStep, measureTarget]);

  // ── Keyboard handler ─────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (currentStep === steps.length - 1) {
          completeTour(true);
        } else {
          goToStep(currentStep + 1, "forward");
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentStep > 0) goToStep(currentStep - 1, "backward");
      } else if (e.key === "Escape") {
        e.preventDefault();
        completeTour();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isActive, currentStep, steps.length, goToStep, completeTour]);

  if (showCelebration) {
    return <TourCelebration onDismiss={() => setShowCelebration(false)} />;
  }

  if (!isActive) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const pad = 8; // spotlight padding around target

  return (
    <div className="fixed inset-0 z-[9995]">
      {/* Layer 1: SVG mask — visual overlay with cutout (pointer-events: none) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect
              animate={
                spotlightRect
                  ? {
                      x: spotlightRect.x - pad,
                      y: spotlightRect.y - pad,
                      width: spotlightRect.width + pad * 2,
                      height: spotlightRect.height + pad * 2,
                      opacity: 1,
                    }
                  : { opacity: 0 }
              }
              initial={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              rx={12}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Layer 2: Click blocker — catches clicks on dimmed area */}
      <div className="absolute inset-0" />

      {/* Layer 3: Spotlight click zone — click the highlighted element to advance */}
      {spotlightRect && (
        <div
          className="absolute z-[2] cursor-pointer"
          style={{
            left: spotlightRect.x - pad,
            top: spotlightRect.y - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
          }}
          onClick={() => {
            if (currentStep === steps.length - 1) completeTour(true);
            else goToStep(currentStep + 1, "forward");
          }}
          title="Click to advance"
        />
      )}

      {/* Layer 4: Spotlight glow ring — animates between targets */}
      <AnimatePresence>
        {spotlightRect && (
          <motion.div
            key="glow"
            className="absolute rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: spotlightRect.x - pad,
              top: spotlightRect.y - pad,
              width: spotlightRect.width + pad * 2,
              height: spotlightRect.height + pad * 2,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ boxShadow: "0 0 0 4px rgba(124, 28, 255, 0.2)" }}
          />
        )}
      </AnimatePresence>

      {/* Layer 5: Speech bubble */}
      <TourStepBubble
        step={step}
        stepIndex={currentStep}
        totalSteps={steps.length}
        targetRect={spotlightRect}
        onNext={() => goToStep(currentStep + 1, "forward")}
        onBack={() => goToStep(currentStep - 1, "backward")}
        onSkip={() => completeTour(false)}
        onFinish={() => completeTour(true)}
      />
    </div>
  );
}
