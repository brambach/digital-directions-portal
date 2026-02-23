"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MappingConnector, type MappingEntry } from "@/components/mapping-connector";
import { DigiMascot } from "@/components/digi-mascot";
import { toast } from "sonner";
import { ApiCredentialsDialog } from "@/components/api-credentials-dialog";
import {
  Check,
  Clock,
  Eye,
  Loader2,
  Send,
  RotateCcw,
  Download,
  Plus,
  Plug,
  Trash2,
  Settings,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAPPING_CATEGORIES,
  DEFAULT_HIBOB_VALUES,
  DEFAULT_KEYPAY_VALUES,
  type MappingCategory,
} from "@/lib/mapping-defaults";

interface MappingConfig {
  id: string;
  projectId: string;
  payrollSystem: string;
  status: string;
  hibobValues: Record<string, string[]>;
  payrollValues: Record<string, string[]>;
  reviewNotes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  exportedAt: string | null;
}

interface AdminMappingContentProps {
  projectId: string;
  projectName: string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ElementType }> = {
  active: { label: "In Progress", badgeClass: "bg-violet-50 text-[#7C1CFF]", icon: Clock },
  in_review: { label: "Awaiting Review", badgeClass: "bg-amber-50 text-amber-600", icon: Eye },
  approved: { label: "Approved", badgeClass: "bg-emerald-50 text-emerald-600", icon: Check },
};

export function AdminMappingContent({ projectId, projectName }: AdminMappingContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<MappingConfig | null>(null);
  const [entries, setEntries] = useState<MappingEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<MappingCategory>("leave_types");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Initialize state
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [initHibobValues, setInitHibobValues] = useState<Record<string, string[]>>(DEFAULT_HIBOB_VALUES);
  const [initPayrollValues, setInitPayrollValues] = useState<Record<string, string[]>>(DEFAULT_KEYPAY_VALUES);
  const [initializing, setInitializing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MappingCategory | null>(null);
  const [newValueInput, setNewValueInput] = useState("");

  // Edit values state
  const [showEditValues, setShowEditValues] = useState(false);
  const [editHibobValues, setEditHibobValues] = useState<Record<string, string[]>>({});
  const [editPayrollValues, setEditPayrollValues] = useState<Record<string, string[]>>({});
  const [savingValues, setSavingValues] = useState(false);

  // API pull state
  const [pullingHibob, setPullingHibob] = useState(false);
  const [pullingPayroll, setPullingPayroll] = useState(false);
  const [showCredentialDialog, setShowCredentialDialog] = useState<"hibob" | "payroll" | null>(null);
  const [pullWarnings, setPullWarnings] = useState<string[]>([]);
  // Track which mode the pull is for: "init" or "edit"
  const [pullMode, setPullMode] = useState<"init" | "edit">("init");
  // Track whether values were pulled from API (for labels)
  const [hibobPulled, setHibobPulled] = useState(false);
  const [payrollPulled, setPayrollPulled] = useState(false);
  // Track which categories were actually populated from the API (not defaults)
  const [hibobPopulatedCategories, setHibobPopulatedCategories] = useState<MappingCategory[]>([]);
  const [payrollPopulatedCategories, setPayrollPopulatedCategories] = useState<MappingCategory[]>([]);

  const fetchMapping = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mapping`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setEntries(
          (data.entries || []).map((e: any) => ({
            category: e.category,
            hibobValue: e.hibobValue,
            payrollValue: e.payrollValue,
          }))
        );
        if (data.config?.reviewNotes) {
          setReviewNotes(data.config.reviewNotes);
        }
      }
    } catch (error) {
      console.error("Error fetching mapping:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMapping();
  }, [fetchMapping]);

  // Initialize mapping
  const handleInitialize = async () => {
    // Validate at least some HiBob values exist
    const hasValues = Object.values(initHibobValues).some((arr) => arr.length > 0);
    if (!hasValues) {
      toast.error("Please add at least some HiBob values before initializing");
      return;
    }

    setInitializing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hibobValues: initHibobValues,
          payrollValues: initPayrollValues,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initialize mapping");
      }
      toast.success("Mapping initialized — client has been notified");
      setShowInitDialog(false);
      router.refresh();
      fetchMapping();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to initialize mapping";
      toast.error(message);
    } finally {
      setInitializing(false);
    }
  };

  // Review mapping
  const handleReview = async (action: "approve" | "request_changes") => {
    setReviewing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mapping/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }
      toast.success(
        action === "approve"
          ? "Mapping approved — client has been notified"
          : "Changes requested — client has been notified"
      );
      router.refresh();
      fetchMapping();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit review";
      toast.error(message);
    } finally {
      setReviewing(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mapping/export`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to export");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") || "data-mapping.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
      fetchMapping();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to export";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  // Save edited values
  const handleSaveValues = async () => {
    setSavingValues(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mapping/values`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hibobValues: editHibobValues,
          payrollValues: editPayrollValues,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save values");
      }
      toast.success("Values updated");
      setShowEditValues(false);
      fetchMapping();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save values";
      toast.error(message);
    } finally {
      setSavingValues(false);
    }
  };

  // Check if credentials exist and start pull flow
  const startPull = async (side: "hibob" | "payroll", mode: "init" | "edit") => {
    setPullMode(mode);
    try {
      const res = await fetch(`/api/projects/${projectId}/credentials`);
      if (!res.ok) throw new Error("Failed to check credentials");
      const data = await res.json();

      const hasCredentials =
        side === "hibob" ? data.hasHibobCredentials : data.hasPayrollCredentials;

      if (hasCredentials) {
        // Credentials already saved — pull directly
        executePull(side, mode);
      } else {
        // Need credentials — show dialog
        setShowCredentialDialog(side);
      }
    } catch {
      // If check fails, show dialog so user can provide credentials
      setShowCredentialDialog(side);
    }
  };

  // Execute the pull (either with saved credentials or with provided ones)
  const executePull = async (
    side: "hibob" | "payroll",
    mode: "init" | "edit",
    credentials?: Record<string, string>,
    saveCredentials?: boolean
  ) => {
    const setPulling = side === "hibob" ? setPullingHibob : setPullingPayroll;
    setPulling(true);
    setPullWarnings([]);
    setShowCredentialDialog(null);

    try {
      const body: Record<string, unknown> = { side };
      if (credentials) {
        if (side === "hibob") body.hibobCredentials = credentials;
        else body.keypayCredentials = credentials;
        if (saveCredentials) body.saveCredentials = true;
      }

      const res = await fetch(`/api/projects/${projectId}/mapping/pull-values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to pull values");
      }

      const result = await res.json();
      const pulledValues: Record<string, string[]> = result.values;
      const populated: string[] = result.categoriesPopulated;
      const warnings: string[] = result.warnings;

      // Replace mode: for populated categories, swap in API values entirely.
      // For categories that fell back to defaults, keep existing values untouched.
      if (mode === "init") {
        if (side === "hibob") {
          setInitHibobValues((prev) => replacePopulatedValues(prev, pulledValues, populated));
        } else {
          setInitPayrollValues((prev) => replacePopulatedValues(prev, pulledValues, populated));
        }
      } else {
        if (side === "hibob") {
          setEditHibobValues((prev) => replacePopulatedValues(prev, pulledValues, populated));
        } else {
          setEditPayrollValues((prev) => replacePopulatedValues(prev, pulledValues, populated));
        }
      }

      // Mark as pulled from API and track which categories were populated
      if (side === "hibob") {
        setHibobPulled(true);
        setHibobPopulatedCategories(populated as MappingCategory[]);
      } else {
        setPayrollPulled(true);
        setPayrollPopulatedCategories(populated as MappingCategory[]);
      }

      // Count total values pulled (only from populated categories)
      const totalPulled = populated.reduce(
        (sum, cat) => sum + (pulledValues[cat]?.length || 0),
        0
      );
      toast.success(`Pulled ${totalPulled} values across ${populated.length} categories`);

      if (warnings.length > 0) {
        setPullWarnings(warnings);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to pull values";
      toast.error(message);
    } finally {
      setPulling(false);
    }
  };

  // Replace values for categories that were populated from the API.
  // Categories that fell back to defaults are left untouched (preserves manual edits).
  const replacePopulatedValues = (
    existing: Record<string, string[]>,
    pulled: Record<string, string[]>,
    populatedCategories: string[]
  ): Record<string, string[]> => {
    const result = { ...existing };
    for (const category of populatedCategories) {
      if (pulled[category]) {
        // Deduplicate within pulled values
        result[category] = [...new Set(pulled[category])];
      }
    }
    return result;
  };

  // Handle credential dialog submission
  const handleCredentialSubmit = (
    credentials: Record<string, string>,
    saveForLater: boolean
  ) => {
    if (!showCredentialDialog) return;
    executePull(showCredentialDialog, pullMode, credentials, saveForLater);
  };

  // Add value to a category in init dialog
  const addValueToCategory = (
    side: "hibob" | "payroll",
    category: MappingCategory,
    value: string
  ) => {
    if (!value.trim()) return;
    if (side === "hibob") {
      const existing = initHibobValues[category] || [];
      if (existing.includes(value.trim())) return;
      setInitHibobValues({ ...initHibobValues, [category]: [...existing, value.trim()] });
    } else {
      const existing = initPayrollValues[category] || [];
      if (existing.includes(value.trim())) return;
      setInitPayrollValues({ ...initPayrollValues, [category]: [...existing, value.trim()] });
    }
    setNewValueInput("");
  };

  const removeValueFromCategory = (
    side: "hibob" | "payroll",
    category: MappingCategory,
    value: string
  ) => {
    if (side === "hibob") {
      const existing = initHibobValues[category] || [];
      setInitHibobValues({ ...initHibobValues, [category]: existing.filter((v) => v !== value) });
    } else {
      const existing = initPayrollValues[category] || [];
      setInitPayrollValues({ ...initPayrollValues, [category]: existing.filter((v) => v !== value) });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#7C1CFF] animate-spin" />
      </div>
    );
  }

  // No mapping config — show initialize UI
  if (!config) {
    if (!showInitDialog) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
            <DigiMascot variant="neutral" size="sm" className="mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Initialize Data Mapping</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              Set up the HiBob and payroll values for this project.
              The client will then map HiBob values to their corresponding payroll system values.
            </p>
            <Button
              onClick={() => setShowInitDialog(true)}
              className="rounded-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Values
            </Button>
          </div>
        </div>
      );
    }

    // Init dialog — configure values per category
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Configure Mapping Values</h3>
            <p className="text-sm text-slate-500">
              Both sides are pre-filled with common defaults — edit as needed for this project.
            </p>
          </div>

          {/* Pull from API buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startPull("hibob", "init")}
              disabled={pullingHibob}
              className="rounded-full text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              {pullingHibob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Plug className="w-3.5 h-3.5 mr-1.5" />
              )}
              Pull from HiBob
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startPull("payroll", "init")}
              disabled={pullingPayroll}
              className="rounded-full text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            >
              {pullingPayroll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Plug className="w-3.5 h-3.5 mr-1.5" />
              )}
              Pull from KeyPay
            </Button>
          </div>

          {/* Credential dialog (inline) */}
          {showCredentialDialog && (
            <ApiCredentialsDialog
              side={showCredentialDialog}
              onSubmit={handleCredentialSubmit}
              onCancel={() => setShowCredentialDialog(null)}
              loading={pullingHibob || pullingPayroll}
            />
          )}

          {/* Post-pull curation banner */}
          {(hibobPulled || payrollPulled) && pullWarnings.length === 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#7C1CFF] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-violet-700">
                    Values pulled from {hibobPulled && payrollPulled ? "HiBob & KeyPay" : hibobPulled ? "HiBob" : "KeyPay"}
                  </p>
                  <p className="text-xs text-violet-600 mt-0.5">
                    Review each category below and remove any values that don&apos;t apply to this project before initializing.
                    Categories marked with <Check className="w-3 h-3 inline text-emerald-500" /> were populated from the API.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pull warnings */}
          {pullWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-amber-700">Pull warnings</span>
                <button
                  onClick={() => setPullWarnings([])}
                  className="ml-auto text-amber-400 hover:text-amber-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {pullWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600 pl-5">{w}</p>
              ))}
              <p className="text-xs text-amber-600 pl-5 font-medium pt-1">
                Categories with warnings still use defaults — review and edit as needed.
              </p>
            </div>
          )}

          {/* Category selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {MAPPING_CATEGORIES.map((cat) => {
              const isHibobPopulated = hibobPopulatedCategories.includes(cat.key);
              const isPayrollPopulated = payrollPopulatedCategories.includes(cat.key);
              const hasApiData = isHibobPopulated || isPayrollPopulated;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setEditingCategory(cat.key);
                    setNewValueInput("");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1",
                    editingCategory === cat.key
                      ? "bg-[#7C1CFF] text-white"
                      : hasApiData
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {hasApiData && editingCategory !== cat.key && (
                    <Check className="w-3 h-3 text-emerald-500" />
                  )}
                  {cat.label}
                  <span className="ml-0.5 opacity-60">
                    ({(initHibobValues[cat.key] || []).length})
                  </span>
                </button>
              );
            })}
          </div>

          {editingCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* HiBob values */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    HiBob Values
                  </span>
                  {hibobPulled && editingCategory && hibobPopulatedCategories.includes(editingCategory) ? (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      from API
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                      defaults
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addValueToCategory("hibob", editingCategory, newValueInput);
                      }
                    }}
                    placeholder="Add HiBob value..."
                    className="bg-white border-slate-200 rounded-xl text-sm flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addValueToCategory("hibob", editingCategory, newValueInput)}
                    className="rounded-full shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {(initHibobValues[editingCategory] || []).map((val, idx) => (
                    <div key={`${val}-${idx}`} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                      <span>{val}</span>
                      <button
                        onClick={() => removeValueFromCategory("hibob", editingCategory, val)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(initHibobValues[editingCategory] || []).length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2">No values added yet</p>
                  )}
                </div>
              </div>

              {/* Payroll values */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payroll Values
                  </span>
                  {payrollPulled && editingCategory && payrollPopulatedCategories.includes(editingCategory) ? (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      from API
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                      defaults
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value=""
                    onChange={() => {}}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addValueToCategory("payroll", editingCategory, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                    placeholder="Add payroll value..."
                    className="bg-white border-slate-200 rounded-xl text-sm flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.querySelector(`[placeholder="Add payroll value..."]`) as HTMLInputElement;
                      if (input) {
                        addValueToCategory("payroll", editingCategory, input.value);
                        input.value = "";
                      }
                    }}
                    className="rounded-full shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {(initPayrollValues[editingCategory] || []).map((val, idx) => (
                    <div key={`${val}-${idx}`} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                      <span>{val}</span>
                      <button
                        onClick={() => removeValueFromCategory("payroll", editingCategory, val)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowInitDialog(false);
                setEditingCategory(null);
              }}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInitialize}
              disabled={initializing}
              className="rounded-full"
            >
              {initializing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Initialize & Notify Client
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Config exists — show mapping view
  const statusConfig = STATUS_CONFIG[config.status] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;
  const totalHibob = Object.values(config.hibobValues).reduce((sum, arr) => sum + arr.length, 0);
  // Count unique HiBob values that have at least one mapping (not raw entry count)
  const totalMapped = new Set(entries.map((e) => `${e.category}::${e.hibobValue}`)).size;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
              statusConfig.badgeClass
            )}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </span>
          <span className="text-sm text-slate-500">
            {totalMapped} of {totalHibob} values mapped
          </span>
        </div>
        <div className="flex items-center gap-2">
          {config.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditHibobValues(config.hibobValues);
                setEditPayrollValues(config.payrollValues);
                setShowEditValues(true);
              }}
              className="rounded-full text-xs"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Edit Values
            </Button>
          )}
          {config.status === "approved" && (
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              Export CSV
            </Button>
          )}
          {config.exportedAt && (
            <span className="text-xs text-slate-400">
              Exported {new Date(config.exportedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Edit values dialog overlay */}
      {showEditValues && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Edit Values</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditValues(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Add or remove HiBob and payroll values. Changes will take effect after saving.
          </p>

          {/* Pull from API buttons (edit mode) */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startPull("hibob", "edit")}
              disabled={pullingHibob}
              className="rounded-full text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              {pullingHibob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Plug className="w-3.5 h-3.5 mr-1.5" />
              )}
              Pull from HiBob
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startPull("payroll", "edit")}
              disabled={pullingPayroll}
              className="rounded-full text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            >
              {pullingPayroll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Plug className="w-3.5 h-3.5 mr-1.5" />
              )}
              Pull from KeyPay
            </Button>
          </div>

          {/* Credential dialog (edit mode) */}
          {showCredentialDialog && (
            <ApiCredentialsDialog
              side={showCredentialDialog}
              onSubmit={handleCredentialSubmit}
              onCancel={() => setShowCredentialDialog(null)}
              loading={pullingHibob || pullingPayroll}
            />
          )}

          {/* Post-pull curation banner (edit mode) */}
          {(hibobPulled || payrollPulled) && pullWarnings.length === 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#7C1CFF] shrink-0 mt-0.5" />
                <p className="text-xs text-violet-600">
                  Values replaced for populated categories. Review and remove any that don&apos;t apply, then save.
                </p>
              </div>
            </div>
          )}

          {/* Pull warnings (edit mode) */}
          {pullWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-amber-700">Pull warnings</span>
                <button
                  onClick={() => setPullWarnings([])}
                  className="ml-auto text-amber-400 hover:text-amber-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {pullWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600 pl-5">{w}</p>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {MAPPING_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setEditingCategory(cat.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                  editingCategory === cat.key
                    ? "bg-[#7C1CFF] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {editingCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HiBob */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-orange-500 uppercase">HiBob</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add value..."
                    className="bg-white border-slate-200 rounded-xl text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          const existing = editHibobValues[editingCategory] || [];
                          if (!existing.includes(val)) {
                            setEditHibobValues({ ...editHibobValues, [editingCategory]: [...existing, val] });
                          }
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(editHibobValues[editingCategory] || []).map((val, idx) => (
                    <div key={`${val}-${idx}`} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg text-sm">
                      <span>{val}</span>
                      <button onClick={() => {
                        setEditHibobValues({
                          ...editHibobValues,
                          [editingCategory]: (editHibobValues[editingCategory] || []).filter((v) => v !== val),
                        });
                      }} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Payroll */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-500 uppercase">Payroll</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add value..."
                    className="bg-white border-slate-200 rounded-xl text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          const existing = editPayrollValues[editingCategory] || [];
                          if (!existing.includes(val)) {
                            setEditPayrollValues({ ...editPayrollValues, [editingCategory]: [...existing, val] });
                          }
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(editPayrollValues[editingCategory] || []).map((val, idx) => (
                    <div key={`${val}-${idx}`} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg text-sm">
                      <span>{val}</span>
                      <button onClick={() => {
                        setEditPayrollValues({
                          ...editPayrollValues,
                          [editingCategory]: (editPayrollValues[editingCategory] || []).filter((v) => v !== val),
                        });
                      }} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEditValues(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleSaveValues} disabled={savingValues} className="rounded-full">
              {savingValues ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Mapping connector (read-only for admin) */}
      <MappingConnector
        hibobValues={config.hibobValues}
        payrollValues={config.payrollValues}
        entries={entries}
        categories={MAPPING_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onEntriesChange={() => {}}
        readOnly={true}
      />

      {/* Review section — only show when in_review */}
      {config.status === "in_review" && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Review Notes</h3>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add notes for the client (optional for approval, recommended for change requests)"
            className="bg-white border-slate-200 rounded-xl min-h-[80px] text-sm"
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleReview("request_changes")}
              disabled={reviewing}
              className="rounded-full text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            >
              {reviewing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Request Changes
            </Button>
            <Button
              onClick={() => handleReview("approve")}
              disabled={reviewing}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700"
            >
              {reviewing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </div>
      )}

      {/* Review notes display */}
      {config.status === "approved" && config.reviewNotes && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Review Notes</p>
          <p className="text-sm text-emerald-800">{config.reviewNotes}</p>
        </div>
      )}

      {config.status === "active" && config.reviewNotes && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Changes Requested</p>
          <p className="text-sm text-amber-800">{config.reviewNotes}</p>
        </div>
      )}
    </div>
  );
}
