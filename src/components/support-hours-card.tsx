"use client";

import { useEffect, useState } from "react";
import { Clock, Settings, Zap } from "lucide-react";
import { EditSupportHoursDialog } from "@/components/edit-support-hours-dialog";
import { cn } from "@/lib/utils";

interface SupportHoursData {
  allocatedHours: number;
  usedHours: number;
  remainingHours: number;
  percentageUsed: number;
  billingCycleStart: string | null;
}

interface SupportHoursCardProps {
  clientId: string;
  isAdmin?: boolean;
}

export function SupportHoursCard({ clientId, isAdmin = false }: SupportHoursCardProps) {
  const [data, setData] = useState<SupportHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/support-hours`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching support hours:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleUpdate = () => {
    setEditDialogOpen(false);
    fetchData(); // Refresh data after update
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-50 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-50 rounded-lg w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-50 rounded-lg w-full mb-2"></div>
        <div className="h-12 bg-gray-50 rounded-lg w-full"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const hasHours = data.allocatedHours > 0;
  const isOverUsed = data.usedHours > data.allocatedHours;
  const isNearLimit = data.percentageUsed >= 80 && !isOverUsed;

  return (
    <>
      <div className="bg-white rounded-xl p-6 border border-gray-50 shadow-sm transition-all hover-card">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Support Hours</h3>
          </div>
          {isAdmin && (
            <button
              onClick={() => setEditDialogOpen(true)}
              className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {!hasHours ? (
          <div className="text-center py-6">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-4">No support package</p>
            {isAdmin && (
              <button
                onClick={() => setEditDialogOpen(true)}
                className="text-[10px] font-bold text-purple-700 uppercase tracking-widest hover:underline"
              >
                Set up support hours
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-gray-900">
                  {data.remainingHours}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">hours left</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {data.usedHours} / {data.allocatedHours} hrs
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-2 bg-gray-50 rounded-full overflow-hidden mb-4">
              <div
                className={cn(
                  "h-full transition-all duration-700 ease-out rounded-full",
                  isOverUsed
                    ? "bg-red-500"
                    : isNearLimit
                      ? "bg-amber-500"
                      : "bg-purple-700"
                )}
                style={{
                  width: `${Math.min(data.percentageUsed, 100)}%`,
                }}
              />
            </div>

            {/* Status Message */}
            <div className="flex items-center justify-between">
              {isOverUsed ? (
                <div className="flex items-center gap-1.5 text-red-600">
                  <Zap className="w-3 h-3 fill-red-600" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Limit Exceeded</span>
                </div>
              ) : isNearLimit ? (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <Zap className="w-3 h-3 fill-amber-600 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Running Low</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{data.percentageUsed}% Plan Utility</span>
                </div>
              )}

              {data.billingCycleStart && (
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                  Cycle: {new Date(data.billingCycleStart).toLocaleDateString()}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <EditSupportHoursDialog
          clientId={clientId}
          currentHours={data.allocatedHours}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
}
