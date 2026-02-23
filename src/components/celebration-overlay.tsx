"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { DigiMascot } from "@/components/digi-mascot";
import { Rocket, Users, FileCheck, Zap } from "lucide-react";

interface SyncStats {
  employeesSynced?: number;
  recordsCreated?: number;
  recipesActive?: number;
  integrationName?: string;
}

interface CelebrationOverlayProps {
  projectName: string;
  syncStats?: SyncStats | null;
  onDismiss: () => void;
}

export function CelebrationOverlay({
  projectName,
  syncStats,
  onDismiss,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiFired = useRef(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  useEffect(() => {
    if (!confettiFired.current) {
      confettiFired.current = true;

      // Initial burst
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#7C1CFF", "#A855F7", "#C084FC", "#10B981", "#F59E0B", "#3B82F6"],
      });

      // Delayed side bursts
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ["#7C1CFF", "#A855F7", "#C084FC"],
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ["#10B981", "#34D399", "#6EE7B7"],
        });
      }, 400);
    }

    // Auto-dismiss after 10 seconds
    timerRef.current = setTimeout(dismiss, 10000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
      onClick={dismiss}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 text-center space-y-6 animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Diji celebrating */}
        <div className="flex justify-center">
          <DigiMascot variant="celebrating" size="lg" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Congratulations!
          </h2>
          <p className="text-base font-semibold text-[#7C1CFF]">
            Your integration is now live!
          </p>
          <p className="text-sm text-slate-500">
            {projectName} has been successfully switched to production.
          </p>
        </div>

        {/* Sync stats */}
        {syncStats && (
          <div className="grid grid-cols-2 gap-3">
            {syncStats.employeesSynced != null && (
              <StatCard
                icon={Users}
                label="Employees Synced"
                value={syncStats.employeesSynced}
              />
            )}
            {syncStats.recordsCreated != null && (
              <StatCard
                icon={FileCheck}
                label="Records Created"
                value={syncStats.recordsCreated}
              />
            )}
            {syncStats.recipesActive != null && (
              <StatCard
                icon={Zap}
                label="Recipes Active"
                value={syncStats.recipesActive}
              />
            )}
            {syncStats.integrationName && (
              <StatCard
                icon={Rocket}
                label="Integration"
                value={syncStats.integrationName}
              />
            )}
          </div>
        )}

        {/* Dismiss hint */}
        <p className="text-xs text-slate-400">
          Click anywhere to dismiss
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
      <Icon className="w-4 h-4 text-[#7C1CFF] mx-auto mb-1.5" />
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
        {label}
      </p>
    </div>
  );
}
