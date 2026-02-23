"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  MapPin,
  Calendar,
  Repeat,
  FileText,
  DollarSign,
  UserX,
  Check,
  X,
  Link2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { MappingCategory } from "@/lib/mapping-defaults";

/* ------------------------------------------------------------------ */
/*  Fuzzy matching for Smart Auto-Match                                */
/* ------------------------------------------------------------------ */

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function wordOverlapScore(a: string, b: string): number {
  const wordsA = new Set(normalizeForMatch(a).split(" "));
  const wordsB = new Set(normalizeForMatch(b).split(" "));
  let overlap = 0;
  for (const w of wordsA) {
    if (w.length < 2) continue;
    if (wordsB.has(w)) {
      overlap++;
    } else {
      // Partial match — check if a word in B starts with/contains this word
      for (const wb of wordsB) {
        if (wb.length < 2) continue;
        if (wb.includes(w) || w.includes(wb)) {
          overlap += 0.5;
          break;
        }
      }
    }
  }
  const maxWords = Math.max(wordsA.size, wordsB.size);
  return maxWords > 0 ? overlap / maxWords : 0;
}

function findBestMatch(hibobValue: string, payrollValues: string[]): { value: string; score: number } | null {
  let best: { value: string; score: number } | null = null;
  for (const pv of payrollValues) {
    const score = wordOverlapScore(hibobValue, pv);
    if (score > 0.3 && (!best || score > best.score)) {
      best = { value: pv, score };
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MappingEntry {
  category: string;
  hibobValue: string;
  payrollValue: string;
}

interface MappingConnectorProps {
  hibobValues: Record<string, string[]>;
  payrollValues: Record<string, string[]>;
  entries: MappingEntry[];
  categories: { key: MappingCategory; label: string }[];
  activeCategory: MappingCategory;
  onCategoryChange: (category: MappingCategory) => void;
  onEntriesChange: (entries: MappingEntry[]) => void;
  readOnly?: boolean;
  saving?: boolean;
  onSubmitRequest?: () => void;
  isSubmitting?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Category Icons                                                     */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  leave_types: CalendarDays,
  locations: MapPin,
  pay_periods: Calendar,
  pay_frequencies: Repeat,
  employment_contracts: FileText,
  pay_categories: DollarSign,
  termination_reasons: UserX,
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function MappingConnector({
  hibobValues,
  payrollValues,
  entries,
  categories,
  activeCategory,
  onCategoryChange,
  onEntriesChange,
  readOnly = false,
  saving = false,
  onSubmitRequest,
  isSubmitting = false,
}: MappingConnectorProps) {
  const [selectedHibob, setSelectedHibob] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hibobCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const payrollCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lineCoords, setLineCoords] = useState<
    { x1: number; y1: number; x2: number; y2: number; hibob: string; payroll: string }[]
  >([]);

  // Track newly added connections for draw-in animation
  const [newConnectionKeys, setNewConnectionKeys] = useState<Set<string>>(new Set());

  // Undo state
  const undoSnapshotRef = useRef<MappingEntry[] | null>(null);
  const undoToastIdRef = useRef<string | number | null>(null);

  // Get values for active category
  const currentHibobValues = useMemo(
    () => hibobValues[activeCategory] || [],
    [hibobValues, activeCategory]
  );
  const currentPayrollValues = useMemo(
    () => payrollValues[activeCategory] || [],
    [payrollValues, activeCategory]
  );

  // Filter entries for active category
  const categoryEntries = useMemo(
    () => entries.filter((e) => e.category === activeCategory),
    [entries, activeCategory]
  );

  // Build lookup maps
  const hibobToPayroll = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of categoryEntries) {
      map.set(e.hibobValue, e.payrollValue);
    }
    return map;
  }, [categoryEntries]);

  const payrollToHibobList = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of categoryEntries) {
      const list = map.get(e.payrollValue) || [];
      list.push(e.hibobValue);
      map.set(e.payrollValue, list);
    }
    return map;
  }, [categoryEntries]);

  // Progress per category
  const getCategoryProgress = useCallback(
    (catKey: string) => {
      const hibobCount = (hibobValues[catKey] || []).length;
      if (hibobCount === 0) return { mapped: 0, total: 0 };
      const mapped = entries.filter(
        (e) => e.category === catKey
      ).length;
      return { mapped, total: hibobCount };
    },
    [hibobValues, entries]
  );

  // Check mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Calculate SVG line coordinates
  const updateLines = useCallback(() => {
    if (isMobile || !containerRef.current) {
      setLineCoords([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const coords: typeof lineCoords = [];

    for (const entry of categoryEntries) {
      const hibobEl = hibobCardRefs.current.get(entry.hibobValue);
      const payrollEl = payrollCardRefs.current.get(entry.payrollValue);
      if (!hibobEl || !payrollEl) continue;

      const hRect = hibobEl.getBoundingClientRect();
      const pRect = payrollEl.getBoundingClientRect();

      coords.push({
        x1: hRect.right - containerRect.left,
        y1: hRect.top + hRect.height / 2 - containerRect.top,
        x2: pRect.left - containerRect.left,
        y2: pRect.top + pRect.height / 2 - containerRect.top,
        hibob: entry.hibobValue,
        payroll: entry.payrollValue,
      });
    }

    setLineCoords(coords);
  }, [categoryEntries, isMobile]);

  useEffect(() => {
    updateLines();
    // Recalculate on resize/scroll
    const handler = () => requestAnimationFrame(updateLines);
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [updateLines]);

  // Recalculate lines after category change (DOM needs to settle)
  useEffect(() => {
    const timer = setTimeout(updateLines, 50);
    return () => clearTimeout(timer);
  }, [activeCategory, categoryEntries.length, updateLines]);

  // Handle click on HiBob card
  const handleHibobClick = (value: string) => {
    if (readOnly) return;
    if (selectedHibob === value) {
      setSelectedHibob(null);
    } else {
      setSelectedHibob(value);
    }
  };

  // Handle click on Payroll card (completes the connection)
  const handlePayrollClick = (payrollValue: string) => {
    if (readOnly || !selectedHibob) return;

    // Save undo snapshot
    undoSnapshotRef.current = [...entries];

    const newEntries = entries.filter(
      (e) => !(e.category === activeCategory && e.hibobValue === selectedHibob)
    );

    newEntries.push({
      category: activeCategory,
      hibobValue: selectedHibob,
      payrollValue,
    });

    // Track this as a new connection for line draw-in animation
    const connectionKey = `${activeCategory}:${selectedHibob}:${payrollValue}`;
    setNewConnectionKeys((prev) => new Set(prev).add(connectionKey));
    setTimeout(() => {
      setNewConnectionKeys((prev) => {
        const next = new Set(prev);
        next.delete(connectionKey);
        return next;
      });
    }, 600);

    onEntriesChange(newEntries);
    setSelectedHibob(null);
  };

  // Handle removing a mapping (with undo toast)
  const handleRemoveMapping = (hibobValue: string) => {
    if (readOnly) return;

    const removedEntry = entries.find(
      (e) => e.category === activeCategory && e.hibobValue === hibobValue
    );
    const previousEntries = [...entries];

    const newEntries = entries.filter(
      (e) => !(e.category === activeCategory && e.hibobValue === hibobValue)
    );
    onEntriesChange(newEntries);

    // Show undo toast
    if (removedEntry) {
      // Dismiss any existing undo toast
      if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current);

      undoToastIdRef.current = toast(
        `Unmapped "${removedEntry.hibobValue}"`,
        {
          action: {
            label: "Undo",
            onClick: () => {
              onEntriesChange(previousEntries);
            },
          },
          duration: 5000,
        }
      );
    }
  };

  // Smart Auto-Match: fuzzy-match unmapped HiBob values to payroll values
  const handleAutoMatch = () => {
    if (readOnly) return;

    const currentHibob = hibobValues[activeCategory] || [];
    const currentPayroll = payrollValues[activeCategory] || [];
    const alreadyMapped = new Set(categoryEntries.map((e) => e.hibobValue));

    let newEntries = [...entries];
    let matchCount = 0;
    const newKeys = new Set<string>();

    for (const hVal of currentHibob) {
      if (alreadyMapped.has(hVal)) continue;
      const match = findBestMatch(hVal, currentPayroll);
      if (match) {
        // Remove any existing mapping for this HiBob value (shouldn't exist, but be safe)
        newEntries = newEntries.filter(
          (e) => !(e.category === activeCategory && e.hibobValue === hVal)
        );
        newEntries.push({
          category: activeCategory,
          hibobValue: hVal,
          payrollValue: match.value,
        });
        newKeys.add(`${activeCategory}:${hVal}:${match.value}`);
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Save undo snapshot before auto-match
      const previousEntries = [...entries];

      // Animate all new connections
      setNewConnectionKeys((prev) => new Set([...prev, ...newKeys]));
      setTimeout(() => {
        setNewConnectionKeys((prev) => {
          const next = new Set(prev);
          for (const k of newKeys) next.delete(k);
          return next;
        });
      }, 600);

      onEntriesChange(newEntries);

      // Show undo-capable toast
      if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current);
      undoToastIdRef.current = toast.success(
        `Matched ${matchCount} item${matchCount > 1 ? "s" : ""} automatically`,
        {
          action: {
            label: "Undo",
            onClick: () => {
              onEntriesChange(previousEntries);
            },
          },
          duration: 5000,
        }
      );
    } else {
      toast("No additional matches found", { duration: 3000 });
    }
  };

  // Count unmapped items for auto-match button visibility
  const unmappedInCategory = currentHibobValues.filter(
    (hv) => !hibobToPayroll.has(hv)
  ).length;

  // Mobile: dropdown selector
  const handleMobileSelect = (hibobValue: string, payrollValue: string) => {
    if (readOnly) return;
    const newEntries = entries.filter(
      (e) => !(e.category === activeCategory && e.hibobValue === hibobValue)
    );
    if (payrollValue !== "__unmap__") {
      newEntries.push({
        category: activeCategory,
        hibobValue,
        payrollValue,
      });
    }
    onEntriesChange(newEntries);
  };

  const { mapped: catMapped, total: catTotal } = getCategoryProgress(activeCategory);
  const unmappedCount = catTotal - catMapped;

  // Sequential prev/next navigation
  const currentCategoryIndex = categories.findIndex((c) => c.key === activeCategory);
  const prevCategory = currentCategoryIndex > 0 ? categories[currentCategoryIndex - 1] : null;
  const nextCategory = currentCategoryIndex < categories.length - 1 ? categories[currentCategoryIndex + 1] : null;
  const isLastCategory = currentCategoryIndex === categories.length - 1;
  const nextCatProgress = nextCategory ? getCategoryProgress(nextCategory.key) : null;

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.key] || FileText;
          const { mapped, total } = getCategoryProgress(cat.key);
          const isComplete = total > 0 && mapped === total;
          const isActive = activeCategory === cat.key;

          return (
            <button
              key={cat.key}
              onClick={() => {
                onCategoryChange(cat.key);
                setSelectedHibob(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                isActive
                  ? "bg-[#7C1CFF] text-white shadow-md shadow-violet-200"
                  : isComplete
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
              {total > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isActive
                      ? "bg-white/20 text-white"
                      : isComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  {mapped}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar for current category */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {categories.find((c) => c.key === activeCategory)?.label}
            </span>
            {!readOnly && unmappedInCategory > 0 && (
              <button
                onClick={handleAutoMatch}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#7C1CFF] bg-violet-50 hover:bg-violet-100 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Suggest Matches
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            <span className="text-xs font-medium text-slate-500">
              {catMapped} of {catTotal} mapped
            </span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7C1CFF] rounded-full transition-all duration-300"
            style={{ width: catTotal > 0 ? `${(catMapped / catTotal) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Empty state */}
      {currentHibobValues.length === 0 && currentPayrollValues.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-400">
          No values configured for this category yet.
        </div>
      )}

      {/* Mobile: Dropdown selectors */}
      {isMobile && currentHibobValues.length > 0 && (
        <div className="space-y-3">
          {currentHibobValues.map((hVal) => {
            const mapped = hibobToPayroll.get(hVal);
            return (
              <div
                key={hVal}
                className="bg-white rounded-xl border border-slate-100 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-800">{hVal}</span>
                </div>
                {readOnly ? (
                  <div className="pl-4">
                    {mapped ? (
                      <span className="text-sm text-[#7C1CFF] font-medium">{mapped}</span>
                    ) : (
                      <span className="text-sm text-slate-300 italic">Unmapped</span>
                    )}
                  </div>
                ) : (
                  <Select
                    value={mapped || "__unmap__"}
                    onValueChange={(v) => handleMobileSelect(hVal, v)}
                  >
                    <SelectTrigger className="bg-white border-slate-200 rounded-xl text-sm">
                      <SelectValue placeholder="Select payroll value..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmap__">
                        <span className="text-slate-400">Unmapped</span>
                      </SelectItem>
                      {currentPayrollValues.map((pVal) => (
                        <SelectItem key={pVal} value={pVal}>
                          {pVal}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop: Interactive card connector */}
      {!isMobile && (currentHibobValues.length > 0 || currentPayrollValues.length > 0) && (
        <div
          ref={containerRef}
          className="relative"
        >
          {/* SVG connection lines */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C1CFF" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#7C1CFF" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7C1CFF" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {lineCoords.map((line, idx) => {
              const dx = line.x2 - line.x1;
              const cp = dx * 0.4;
              const isHighlighted = selectedHibob === line.hibob;
              const connectionKey = `${activeCategory}:${line.hibob}:${line.payroll}`;
              const isNew = newConnectionKeys.has(connectionKey);
              const pathD = `M ${line.x1} ${line.y1} C ${line.x1 + cp} ${line.y1}, ${line.x2 - cp} ${line.y2}, ${line.x2} ${line.y2}`;

              return (
                <path
                  key={idx}
                  d={pathD}
                  fill="none"
                  stroke={isHighlighted ? "#7C1CFF" : "url(#connectionGradient)"}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  className={isNew ? "" : "transition-all duration-200"}
                  strokeLinecap="round"
                  style={{
                    filter: isHighlighted ? "drop-shadow(0 0 4px rgba(124, 28, 255, 0.4))" : "none",
                    // Draw-in animation for new connections
                    ...(isNew
                      ? {
                          strokeDasharray: "1000",
                          strokeDashoffset: "1000",
                          animation: "line-draw-in 0.5s ease-out forwards",
                        }
                      : {}),
                  }}
                />
              );
            })}
          </svg>

          {/* Two-column layout */}
          <div className="grid grid-cols-[1fr_80px_1fr] gap-0">
            {/* Left column — HiBob values */}
            <div className="space-y-2 pr-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  HiBob
                </span>
              </div>
              {currentHibobValues.map((hVal) => {
                const isMapped = hibobToPayroll.has(hVal);
                const isSelected = selectedHibob === hVal;

                return (
                  <div
                    key={hVal}
                    ref={(el) => {
                      if (el) hibobCardRefs.current.set(hVal, el);
                      else hibobCardRefs.current.delete(hVal);
                    }}
                    onClick={() => handleHibobClick(hVal)}
                    className={cn(
                      "relative group px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                      readOnly
                        ? isMapped
                          ? "bg-violet-50 border-violet-200 text-slate-800"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                        : isSelected
                        ? "bg-violet-50 border-[#7C1CFF] text-[#7C1CFF] shadow-[0_0_0_3px_rgba(124,28,255,0.15)] cursor-pointer"
                        : isMapped
                        ? "bg-violet-50/50 border-violet-200 text-slate-800 hover:border-[#7C1CFF] cursor-pointer"
                        : "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:shadow-sm cursor-pointer"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{hVal}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isMapped && (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {!isMapped && !readOnly && (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        {isMapped && !readOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMapping(hVal);
                            }}
                            className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                    {isMapped && (
                      <span className="text-[10px] text-[#7C1CFF]/60 mt-0.5 block truncate">
                        → {hibobToPayroll.get(hVal)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Center connector column */}
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <Link2 className="w-4 h-4" />
              </div>
            </div>

            {/* Right column — Payroll values */}
            <div className="space-y-2 pl-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Payroll
                </span>
              </div>
              {currentPayrollValues.map((pVal) => {
                const connectedHibobValues = payrollToHibobList.get(pVal) || [];
                const hasConnections = connectedHibobValues.length > 0;
                const isClickable = !readOnly && selectedHibob !== null;

                return (
                  <div
                    key={pVal}
                    ref={(el) => {
                      if (el) payrollCardRefs.current.set(pVal, el);
                      else payrollCardRefs.current.delete(pVal);
                    }}
                    onClick={() => isClickable && handlePayrollClick(pVal)}
                    className={cn(
                      "relative px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                      readOnly
                        ? hasConnections
                          ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                        : isClickable && hasConnections
                        ? "bg-emerald-50/50 border-emerald-200 text-slate-800 hover:border-emerald-400 hover:shadow-md cursor-pointer"
                        : isClickable
                        ? "bg-violet-50 border-violet-300 text-slate-800 hover:border-[#7C1CFF] hover:shadow-md cursor-pointer ring-2 ring-violet-100"
                        : hasConnections
                        ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                        : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    <span className="truncate block">{pVal}</span>
                    {/* Connected HiBob values as pills */}
                    {connectedHibobValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {connectedHibobValues.map((hv) => (
                          <span
                            key={hv}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-[10px] font-semibold text-[#7C1CFF]"
                          >
                            {hv}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selection hint */}
          {!readOnly && selectedHibob && (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 text-[#7C1CFF] text-xs font-semibold animate-pulse">
                <Link2 className="w-3.5 h-3.5" />
                Now click a payroll value to connect &quot;{selectedHibob}&quot;
              </span>
            </div>
          )}
        </div>
      )}

      {/* Wizard prev/next navigation */}
      {!readOnly && !selectedHibob && (
        <div className="mt-3 space-y-2">
          {/* Unmapped note — reassures user that skipping is fine */}
          {unmappedCount > 0 && catTotal > 0 && (
            <p className="text-xs text-slate-400 text-center">
              {unmappedCount} unmapped — leave blank if not needed
            </p>
          )}

          {/* Prev / Next bar */}
          <div className="flex items-center justify-between">
            {/* Previous category */}
            {prevCategory ? (
              <button
                onClick={() => {
                  onCategoryChange(prevCategory.key);
                  setSelectedHibob(null);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {prevCategory.label}
              </button>
            ) : (
              <div />
            )}

            {/* Next category or Submit */}
            {nextCategory ? (
              <button
                onClick={() => {
                  onCategoryChange(nextCategory.key);
                  setSelectedHibob(null);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#7C1CFF] bg-violet-50 hover:bg-violet-100 transition-colors group"
              >
                {nextCategory.label}
                {nextCatProgress && nextCatProgress.total > 0 && (
                  <span className="text-[11px] text-violet-400 font-semibold">
                    {nextCatProgress.mapped}/{nextCatProgress.total}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : isLastCategory && onSubmitRequest ? (
              <Button
                onClick={onSubmitRequest}
                disabled={isSubmitting}
                className="rounded-full"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit for Review
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
