"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RoiConfig {
  hoursSavedPerPayRun: number;
  employeeCount: number;
  payRunsPerYear: number;
  hourlyRate: number;
  costOfManualErrors: number;
}

interface RoiConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  config: RoiConfig | null;
  onSaved: () => void;
}

export function RoiConfigDialog({
  open,
  onOpenChange,
  clientId,
  config,
  onSaved,
}: RoiConfigDialogProps) {
  const [hoursSaved, setHoursSaved] = useState(0);
  const [employees, setEmployees] = useState(0);
  const [payRuns, setPayRuns] = useState(26);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [errorCost, setErrorCost] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setHoursSaved(config.hoursSavedPerPayRun);
      setEmployees(config.employeeCount);
      setPayRuns(config.payRunsPerYear);
      setHourlyRate(config.hourlyRate);
      setErrorCost(config.costOfManualErrors);
    } else {
      setHoursSaved(0);
      setEmployees(0);
      setPayRuns(26);
      setHourlyRate(50);
      setErrorCost(0);
    }
  }, [config, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await fetch(`/api/clients/${clientId}/roi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoursSavedPerPayRun: hoursSaved,
          employeeCount: employees,
          payRunsPerYear: payRuns,
          hourlyRate,
          costOfManualErrors: errorCost,
        }),
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving ROI config:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Configure ROI Calculator</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hoursSaved">Hours Saved Per Pay Run</Label>
              <Input
                id="hoursSaved"
                type="number"
                min={0}
                value={hoursSaved}
                onChange={(e) => setHoursSaved(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employees">Employee Count</Label>
              <Input
                id="employees"
                type="number"
                min={0}
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payRuns">Pay Runs Per Year</Label>
              <Input
                id="payRuns"
                type="number"
                min={1}
                value={payRuns}
                onChange={(e) => setPayRuns(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                min={0}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="errorCost">Cost of Manual Errors ($/year)</Label>
            <Input
              id="errorCost"
              type="number"
              min={0}
              value={errorCost}
              onChange={(e) => setErrorCost(Number(e.target.value))}
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[12px] font-semibold text-slate-500 mb-1">Estimated Annual Savings Preview</p>
            <p className="text-xl font-bold text-emerald-600">
              ${((hoursSaved * payRuns * hourlyRate) + errorCost).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              = ({hoursSaved}h x {payRuns} pay runs x ${hourlyRate}/hr) + ${errorCost.toLocaleString()} error savings
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
