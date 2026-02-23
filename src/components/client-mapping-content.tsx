"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MappingConnector, type MappingEntry } from "@/components/mapping-connector";
import { DigiMascot } from "@/components/digi-mascot";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  MAPPING_CATEGORIES,
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
}

interface ClientMappingContentProps {
  projectId: string;
}

export function ClientMappingContent({ projectId }: ClientMappingContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<MappingConfig | null>(null);
  const [entries, setEntries] = useState<MappingEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<MappingCategory>("leave_types");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-save entries (debounced)
  const saveEntries = useCallback(
    async (entriesToSave: MappingEntry[]) => {
      try {
        setSaving(true);
        const res = await fetch(`/api/projects/${projectId}/mapping/entries`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: entriesToSave }),
        });
        if (res.ok) {
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error("Error saving entries:", error);
      } finally {
        setSaving(false);
      }
    },
    [projectId]
  );

  const handleEntriesChange = (newEntries: MappingEntry[]) => {
    setEntries(newEntries);

    // Debounced auto-save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveEntries(newEntries);
    }, 1000);
  };

  const handleSubmit = async () => {
    // Validate that all categories have at least some mappings
    const hibobValues = config?.hibobValues || {};
    const totalHibob = Object.values(hibobValues).reduce((sum, arr) => sum + arr.length, 0);

    if (entries.length === 0) {
      toast.error("Please create at least one mapping before submitting");
      return;
    }

    // Check unmapped categories
    const unmappedCategories = MAPPING_CATEGORIES.filter((cat) => {
      const catHibobValues = hibobValues[cat.key] || [];
      if (catHibobValues.length === 0) return false;
      const catEntries = entries.filter((e) => e.category === cat.key);
      return catEntries.length === 0;
    });

    if (unmappedCategories.length > 0) {
      const names = unmappedCategories.map((c) => c.label).join(", ");
      toast.error(`The following categories have no mappings: ${names}`);
      return;
    }

    setSubmitting(true);
    try {
      // Save final entries
      await saveEntries(entries);

      // Submit
      const res = await fetch(`/api/projects/${projectId}/mapping/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      toast.success("Mappings submitted for review!");
      router.refresh();
      fetchMapping();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#7C1CFF] animate-spin" />
      </div>
    );
  }

  // No config — waiting for admin
  if (!config) {
    return (
      <div className="text-center py-12">
        <DigiMascot variant="sleeping" size="sm" className="mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-700 mb-1">
          Your data mapping is being prepared
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          The Digital Directions team is setting up your mapping values.
          You&apos;ll be notified when it&apos;s ready.
        </p>
      </div>
    );
  }

  // In review — read only
  if (config.status === "in_review") {
    return (
      <ReadOnlyMappingView
        config={config}
        entries={entries}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        bannerType="review"
      />
    );
  }

  // Approved — read only with green banner
  if (config.status === "approved") {
    return (
      <ReadOnlyMappingView
        config={config}
        entries={entries}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        bannerType="approved"
        reviewNotes={config.reviewNotes}
      />
    );
  }

  // Active — editable mapping interface
  const totalHibob = Object.values(config.hibobValues).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Changes requested banner */}
      {config.reviewNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Changes Requested</p>
            <p className="text-sm text-amber-700 mt-1">{config.reviewNotes}</p>
          </div>
        </div>
      )}

      {/* Interactive mapping connector */}
      <MappingConnector
        hibobValues={config.hibobValues}
        payrollValues={config.payrollValues}
        entries={entries}
        categories={MAPPING_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onEntriesChange={handleEntriesChange}
        readOnly={false}
        saving={saving}
        onSubmitRequest={handleSubmit}
        isSubmitting={submitting}
      />

      {/* Save status */}
      {lastSaved && !saving && (
        <div className="text-xs text-slate-400 text-right">
          All changes saved
        </div>
      )}
    </div>
  );
}

// Read-only view for in_review and approved states
function ReadOnlyMappingView({
  config,
  entries,
  activeCategory,
  onCategoryChange,
  bannerType,
  reviewNotes,
}: {
  config: MappingConfig;
  entries: MappingEntry[];
  activeCategory: MappingCategory;
  onCategoryChange: (cat: MappingCategory) => void;
  bannerType: "review" | "approved";
  reviewNotes?: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Status banner */}
      {bannerType === "review" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <DigiMascot variant="construction" size="xs" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Your data mapping is being reviewed
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your mappings. You&apos;ll be notified when the review is complete.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Data mapping approved
            </p>
            {reviewNotes && (
              <p className="text-xs text-emerald-600 mt-0.5">{reviewNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Read-only connector */}
      <MappingConnector
        hibobValues={config.hibobValues}
        payrollValues={config.payrollValues}
        entries={entries}
        categories={MAPPING_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        onEntriesChange={() => {}}
        readOnly={true}
      />
    </div>
  );
}
