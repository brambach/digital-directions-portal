import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roiConfigs, clients } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Calculator, TrendingUp, DollarSign, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { DigiMascot } from "@/components/digi-mascot";

export const dynamic = "force-dynamic";

export default async function ClientRoiPage() {
  const user = await requireAuth();

  if (!user.clientId) return null;

  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, user.clientId), isNull(clients.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] || null);

  if (!client) return null;

  const [config] = await db
    .select()
    .from(roiConfigs)
    .where(eq(roiConfigs.clientId, client.id))
    .limit(1);

  // Placeholder calculation: annualSavings = hoursSavedPerPayRun * payRunsPerYear * hourlyRate + costOfManualErrors
  const hoursSaved = config?.hoursSavedPerPayRun || 0;
  const payRuns = config?.payRunsPerYear || 26;
  const hourlyRate = config?.hourlyRate || 50;
  const errorCost = config?.costOfManualErrors || 0;
  const employees = config?.employeeCount || 0;

  const annualTimeSavings = hoursSaved * payRuns * hourlyRate;
  const annualSavings = annualTimeSavings + errorCost;
  const totalHoursSavedPerYear = hoursSaved * payRuns;
  const monthlySavings = Math.round(annualSavings / 12);

  const hasConfig = !!config && (hoursSaved > 0 || employees > 0);

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Insights
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ROI Calculator
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <Calculator className="w-4 h-4" />
            Estimated integration savings
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">
        {!hasConfig ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <DigiMascot variant="neutral" size="md" className="mx-auto mb-4" />
            <h2 className="text-[17px] font-bold text-slate-800 mb-2">
              ROI Calculator Coming Soon
            </h2>
            <p className="text-[13px] text-slate-500 max-w-md mx-auto">
              Your Digital Directions team is configuring your ROI estimates. Once set up,
              you&apos;ll see a breakdown of how much time and money your integration saves.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Savings Card */}
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold">Estimated Annual Savings</h2>
                  <p className="text-white/70 text-[13px]">Based on your integration configuration</p>
                </div>
              </div>

              <p className="text-5xl font-bold tracking-tight mb-2">
                ${annualSavings.toLocaleString()}
              </p>
              <p className="text-white/70 text-[14px]">
                per year across time savings and error reduction
              </p>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-[18px] h-[18px] text-emerald-600" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-[13px] font-medium text-slate-500 mb-1">Monthly Savings</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                  ${monthlySavings.toLocaleString()}
                </p>
                <p className="text-[12px] text-slate-400 mt-2">Estimated per month</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
                    <Clock className="w-[18px] h-[18px] text-sky-600" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-[13px] font-medium text-slate-500 mb-1">Hours Saved</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                  {totalHoursSavedPerYear}
                </p>
                <p className="text-[12px] text-slate-400 mt-2">Per year</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Users className="w-[18px] h-[18px] text-violet-600" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-[13px] font-medium text-slate-500 mb-1">Employees</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                  {employees}
                </p>
                <p className="text-[12px] text-slate-400 mt-2">Managed via integration</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                    <DollarSign className="w-[18px] h-[18px] text-amber-600" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-[13px] font-medium text-slate-500 mb-1">Error Savings</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                  ${errorCost.toLocaleString()}
                </p>
                <p className="text-[12px] text-slate-400 mt-2">Avoided annually</p>
              </div>
            </div>

            {/* How It's Calculated */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-[15px] font-bold text-slate-800 mb-4">How This Is Calculated</h3>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 font-mono text-[13px] text-slate-600 space-y-2">
                <p>Time savings = {hoursSaved}h/pay run x {payRuns} pay runs/yr x ${hourlyRate}/hr = <span className="font-bold text-slate-800">${annualTimeSavings.toLocaleString()}</span></p>
                <p>Error reduction = <span className="font-bold text-slate-800">${errorCost.toLocaleString()}</span>/year</p>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <p className="font-bold text-emerald-600">Total annual savings = ${annualSavings.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[12px] text-slate-400 mt-3">
                These are estimated figures based on inputs configured by your Digital Directions team.
                The actual formula may be refined over time.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
