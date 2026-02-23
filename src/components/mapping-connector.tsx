"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  ChevronDown,
  Trash2,
  Search,
  PartyPopper,
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
  const [isMobile, setIsMobile] = useState(false);

  // Hover state for read-only view
  const [hoveredHibob, setHoveredHibob] = useState<string | null>(null);
  const [hoveredPayroll, setHoveredPayroll] = useState<string | null>(null);

  // Undo state
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

  // Filter entries for active category — only include entries whose HiBob AND
  // payroll values still exist in the current value lists (ignores stale entries)
  const categoryEntries = useMemo(() => {
    const hibobSet = new Set(currentHibobValues);
    const payrollSet = new Set(currentPayrollValues);
    return entries.filter(
      (e) =>
        e.category === activeCategory &&
        hibobSet.has(e.hibobValue) &&
        payrollSet.has(e.payrollValue)
    );
  }, [entries, activeCategory, currentHibobValues, currentPayrollValues]);

  // Build lookup maps — one HiBob value maps to one payroll value (many HiBob → one payroll is allowed)
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

  // Progress per category — counts unique HiBob values that have at least one valid mapping
  // (ignores stale entries referencing removed values)
  const getCategoryProgress = useCallback(
    (catKey: string) => {
      const hibobVals = hibobValues[catKey] || [];
      const hibobCount = hibobVals.length;
      if (hibobCount === 0) return { mapped: 0, total: 0 };
      const hibobSet = new Set(hibobVals);
      const payrollSet = new Set(payrollValues[catKey] || []);
      const mappedHibobValues = new Set(
        entries
          .filter(
            (e) =>
              e.category === catKey &&
              hibobSet.has(e.hibobValue) &&
              payrollSet.has(e.payrollValue)
          )
          .map((e) => e.hibobValue)
      );
      return { mapped: mappedHibobValues.size, total: hibobCount };
    },
    [hibobValues, payrollValues, entries]
  );

  // Check mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Select a payroll value for a HiBob value (replaces any existing mapping)
  const handleSelectMatch = (hibobValue: string, payrollValue: string | null) => {
    if (readOnly) return;

    const previousEntries = [...entries];

    // Remove existing mapping for this HiBob value
    const newEntries = entries.filter(
      (e) => !(e.category === activeCategory && e.hibobValue === hibobValue)
    );

    if (payrollValue) {
      newEntries.push({
        category: activeCategory,
        hibobValue,
        payrollValue,
      });
    }

    onEntriesChange(newEntries);

    // Show undo toast when unmapping
    if (!payrollValue) {
      const removedEntry = previousEntries.find(
        (e) => e.category === activeCategory && e.hibobValue === hibobValue
      );
      if (removedEntry) {
        if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current);
        undoToastIdRef.current = toast(
          `Unmapped "${removedEntry.hibobValue}"`,
          {
            action: {
              label: "Undo",
              onClick: () => onEntriesChange(previousEntries),
            },
            duration: 5000,
          }
        );
      }
    }
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

    if (removedEntry) {
      if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current);
      undoToastIdRef.current = toast(
        `Unmapped "${removedEntry.hibobValue}"`,
        {
          action: {
            label: "Undo",
            onClick: () => onEntriesChange(previousEntries),
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

    for (const hVal of currentHibob) {
      if (alreadyMapped.has(hVal)) continue;
      const match = findBestMatch(hVal, currentPayroll);
      if (match) {
        newEntries = newEntries.filter(
          (e) => !(e.category === activeCategory && e.hibobValue === hVal)
        );
        newEntries.push({
          category: activeCategory,
          hibobValue: hVal,
          payrollValue: match.value,
        });
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const previousEntries = [...entries];
      onEntriesChange(newEntries);

      if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current);
      undoToastIdRef.current = toast.success(
        `Matched ${matchCount} item${matchCount > 1 ? "s" : ""} automatically`,
        {
          action: {
            label: "Undo",
            onClick: () => onEntriesChange(previousEntries),
          },
          duration: 5000,
        }
      );
    } else {
      toast("No additional matches found", { duration: 3000 });
    }
  };

  // Clear ALL mappings for the current category (with undo)
  const handleClearCategory = () => {
    if (readOnly) return;
    const removedEntries = entries.filter((e) => e.category === activeCategory);
    if (removedEntries.length === 0) return;

    const previousEntries = [...entries];
    const newEntries = entries.filter((e) => e.category !== activeCategory);
    onEntriesChange(newEntries);

    if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current);
    undoToastIdRef.current = toast(
      `Cleared all ${removedEntries.length} mapping${removedEntries.length > 1 ? "s" : ""} in this category`,
      {
        action: {
          label: "Undo",
          onClick: () => onEntriesChange(previousEntries),
        },
        duration: 6000,
      }
    );
  };

  // Count unmapped items for auto-match button visibility
  const unmappedInCategory = currentHibobValues.filter(
    (hv) => !hibobToPayroll.has(hv)
  ).length;

  const { mapped: catMapped, total: catTotal } = getCategoryProgress(activeCategory);
  const unmappedCount = catTotal - catMapped;
  const isCategoryComplete = catTotal > 0 && catMapped === catTotal;

  // Track previous completion state to detect when a category BECOMES complete
  const prevCompleteRef = useRef(false);
  useEffect(() => {
    if (isCategoryComplete && !prevCompleteRef.current && !readOnly) {
      const catLabel = categories.find((c) => c.key === activeCategory)?.label || activeCategory;
      toast.success(`${catLabel} — all mapped!`, {
        icon: <PartyPopper className="w-4 h-4 text-emerald-500" />,
        duration: 3000,
      });
    }
    prevCompleteRef.current = isCategoryComplete;
  }, [isCategoryComplete, activeCategory, categories, readOnly]);

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
                setHoveredHibob(null);
                setHoveredPayroll(null);
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
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                {unmappedInCategory > 0 && (
                  <button
                    onClick={handleAutoMatch}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#7C1CFF] bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Suggest Matches
                  </button>
                )}
                {catMapped > 0 && (
                  <button
                    onClick={handleClearCategory}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                )}
              </div>
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
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isCategoryComplete ? "bg-emerald-500" : "bg-[#7C1CFF]"
            )}
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

      {/* Mobile: Card-based selectors */}
      {isMobile && currentHibobValues.length > 0 && (
        <div className="space-y-3">
          {currentHibobValues.map((hVal) => {
            const mappedValue = hibobToPayroll.get(hVal);
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
                    {mappedValue ? (
                      <span className="text-sm text-[#7C1CFF] font-medium">{mappedValue}</span>
                    ) : (
                      <span className="text-sm text-slate-300 italic">Unmapped</span>
                    )}
                  </div>
                ) : (
                  <PayrollSelect
                    selectedValue={mappedValue || null}
                    allPayrollValues={currentPayrollValues}
                    onSelect={(pv) => handleSelectMatch(hVal, pv)}
                    currentHibobValue={hVal}
                    payrollToHibobList={payrollToHibobList}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* Desktop Interactive: Row-based select layout (editable)       */}
      {/* ============================================================ */}
      {!isMobile && !readOnly && currentHibobValues.length > 0 && (
        <div className="space-y-1.5">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_28px_1fr_32px] gap-3 items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                HiBob Value
              </span>
            </div>
            <div />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Payroll Match
              </span>
            </div>
            <div />
          </div>

          {/* Mapping rows */}
          {currentHibobValues.map((hVal) => {
            const mappedValue = hibobToPayroll.get(hVal);
            const isMapped = !!mappedValue;

            return (
              <div
                key={hVal}
                className={cn(
                  "group grid grid-cols-[1fr_28px_1fr_32px] gap-3 items-center px-4 py-3 rounded-xl border transition-all",
                  isMapped
                    ? "bg-violet-50/30 border-violet-100 hover:border-violet-200"
                    : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                )}
              >
                {/* HiBob value */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {hVal}
                  </span>
                </div>

                {/* Arrow */}
                <ArrowRight className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isMapped ? "text-[#7C1CFF]" : "text-slate-300"
                )} />

                {/* Payroll searchable select */}
                <PayrollSelect
                  selectedValue={mappedValue || null}
                  allPayrollValues={currentPayrollValues}
                  onSelect={(pv) => handleSelectMatch(hVal, pv)}
                  currentHibobValue={hVal}
                  payrollToHibobList={payrollToHibobList}
                />

                {/* Status indicator — check swaps to X on row hover */}
                <div className="flex items-center justify-center w-8">
                  {isMapped ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500 group-hover:hidden" />
                      <button
                        onClick={() => handleRemoveMapping(hVal)}
                        className="hidden group-hover:flex w-6 h-6 rounded-full items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
                        title="Remove mapping"
                      >
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </>
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* Desktop Read-only: Two-column hover-highlight view            */}
      {/* ============================================================ */}
      {!isMobile && readOnly && (currentHibobValues.length > 0 || currentPayrollValues.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left column — HiBob values */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                HiBob
              </span>
            </div>
            {currentHibobValues.map((hVal) => {
              const mappedPayroll = hibobToPayroll.get(hVal);
              const isMapped = !!mappedPayroll;
              const isHighlighted =
                hoveredHibob === hVal ||
                (hoveredPayroll !== null && mappedPayroll === hoveredPayroll);
              const isDimmed =
                !isHighlighted &&
                (hoveredHibob !== null || hoveredPayroll !== null);

              return (
                <div
                  key={hVal}
                  onMouseEnter={() => setHoveredHibob(hVal)}
                  onMouseLeave={() => setHoveredHibob(null)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-default",
                    isHighlighted
                      ? "bg-violet-50 border-[#7C1CFF] shadow-[0_0_0_3px_rgba(124,28,255,0.1)] scale-[1.01]"
                      : isDimmed
                      ? "bg-slate-50/60 border-slate-100 text-slate-400"
                      : isMapped
                      ? "bg-violet-50/50 border-violet-200 text-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{hVal}</span>
                    {isMapped && (
                      <Check className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
                        isHighlighted ? "text-emerald-500" : isDimmed ? "text-emerald-300" : "text-emerald-500"
                      )} />
                    )}
                  </div>
                  {isMapped && (
                    <span className={cn(
                      "text-[10px] mt-0.5 block truncate transition-all duration-200",
                      isHighlighted
                        ? "text-[#7C1CFF] font-semibold"
                        : isDimmed
                        ? "text-slate-300"
                        : "text-[#7C1CFF]/60"
                    )}>
                      → {mappedPayroll}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right column — Payroll values */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Payroll
              </span>
            </div>
            {currentPayrollValues.map((pVal) => {
              const connectedHibobValues = payrollToHibobList.get(pVal) || [];
              const hasConnections = connectedHibobValues.length > 0;
              const isHighlighted =
                hoveredPayroll === pVal ||
                (hoveredHibob !== null && connectedHibobValues.includes(hoveredHibob));
              const isDimmed =
                !isHighlighted &&
                (hoveredHibob !== null || hoveredPayroll !== null);

              return (
                <div
                  key={pVal}
                  onMouseEnter={() => setHoveredPayroll(pVal)}
                  onMouseLeave={() => setHoveredPayroll(null)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-default",
                    isHighlighted
                      ? "bg-emerald-50 border-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.1)] scale-[1.01]"
                      : isDimmed
                      ? "bg-slate-50/60 border-slate-100 text-slate-400"
                      : hasConnections
                      ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <span className="truncate block">{pVal}</span>
                  {connectedHibobValues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {connectedHibobValues.map((hv) => (
                        <span
                          key={hv}
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all duration-200",
                            isHighlighted || hoveredHibob === hv
                              ? "bg-violet-200 text-[#7C1CFF]"
                              : isDimmed
                              ? "bg-slate-100 text-slate-400"
                              : "bg-violet-100 text-[#7C1CFF]/70"
                          )}
                        >
                          ← {hv}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wizard prev/next navigation */}
      {!readOnly && (
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
                onClick={() => onCategoryChange(prevCategory.key)}
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
                onClick={() => onCategoryChange(nextCategory.key)}
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

/* ------------------------------------------------------------------ */
/*  PayrollSelect — Searchable single-select popover with hints        */
/* ------------------------------------------------------------------ */

function PayrollSelect({
  selectedValue,
  allPayrollValues,
  onSelect,
  currentHibobValue,
  payrollToHibobList,
}: {
  selectedValue: string | null;
  allPayrollValues: string[];
  onSelect: (payrollValue: string | null) => void;
  currentHibobValue: string;
  payrollToHibobList: Map<string, string[]>;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredPayroll = useMemo(() => {
    if (!search.trim()) return allPayrollValues;
    const q = search.toLowerCase();
    return allPayrollValues.filter((pv) => pv.toLowerCase().includes(q));
  }, [allPayrollValues, search]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const handleSelect = (pVal: string) => {
    if (pVal === selectedValue) {
      // Clicking same value = unmap
      onSelect(null);
    } else {
      onSelect(pVal);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 min-h-[36px] w-full rounded-xl border px-3 py-1.5 text-sm text-left transition-colors",
            selectedValue
              ? "bg-white border-violet-200 hover:border-violet-300"
              : "bg-white border-dashed border-slate-300 hover:border-slate-400"
          )}
        >
          {selectedValue ? (
            <span className="text-slate-800 truncate">{selectedValue}</span>
          ) : (
            <span className="text-slate-400">Select match...</span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Search header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payroll values..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-300"
            autoFocus
          />
          {selectedValue && (
            <button
              type="button"
              onClick={() => { onSelect(null); setOpen(false); }}
              className="text-[11px] text-red-400 hover:text-red-500 font-medium whitespace-nowrap transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Scrollable item list */}
        <div className="max-h-[260px] overflow-y-auto py-1">
          {filteredPayroll.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              No values match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredPayroll.map((pVal) => {
              const isSelected = pVal === selectedValue;
              // Show which OTHER HiBob values already map to this payroll value
              const otherHibobUsers = (payrollToHibobList.get(pVal) || [])
                .filter((hv) => hv !== currentHibobValue);

              return (
                <button
                  key={pVal}
                  type="button"
                  onClick={() => handleSelect(pVal)}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2 w-full text-left transition-colors",
                    isSelected
                      ? "bg-violet-50 hover:bg-violet-100"
                      : "hover:bg-slate-50"
                  )}
                >
                  {/* Check icon or empty space */}
                  <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#7C1CFF]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-sm block truncate",
                        isSelected ? "text-slate-800 font-medium" : "text-slate-600"
                      )}
                    >
                      {pVal}
                    </span>
                    {otherHibobUsers.length > 0 && (
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        also mapped from {otherHibobUsers.slice(0, 2).join(", ")}
                        {otherHibobUsers.length > 2 && ` +${otherHibobUsers.length - 2}`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
