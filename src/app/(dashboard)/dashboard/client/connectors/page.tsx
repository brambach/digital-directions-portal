import { requireAuth } from "@/lib/auth";
import { Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger-container";

export const dynamic = "force-dynamic";

const CONNECTORS = [
  {
    name: "HiBob",
    description: "Modern HR platform for managing employee data, time off, onboarding, and more. The core HR system that feeds into your payroll integration.",
    status: "available" as const,
    icon: "/images/logos/hibob-icon.png",
    fallbackIcon: "🟣",
    category: "HR Platform",
  },
  {
    name: "KeyPay (Employment Hero)",
    description: "Australia and New Zealand's leading cloud payroll solution. Supports employee sync, leave management, banking, superannuation, and pay run processing.",
    status: "available" as const,
    icon: "/images/logos/keypay-icon.png",
    fallbackIcon: "💰",
    category: "Payroll",
  },
  {
    name: "MYOB",
    description: "Australian accounting and payroll platform with GL integration. Supports employee sync, leave via timesheets, banking, and super fund management.",
    status: "available" as const,
    icon: "/images/logos/myob-icon.png",
    fallbackIcon: "📊",
    category: "Payroll",
  },
  {
    name: "Deputy",
    description: "Workforce management for rostering, scheduling, and time tracking. Syncs leave and shift data between HiBob and Deputy.",
    status: "available" as const,
    icon: "/images/logos/deputy-icon.png",
    fallbackIcon: "📅",
    category: "Workforce",
  },
  {
    name: "Workato",
    description: "Enterprise integration platform (iPaaS) that powers all Digital Directions integrations. Connects HiBob to your payroll system with automated recipes.",
    status: "available" as const,
    icon: "/images/logos/workato-icon.png",
    fallbackIcon: "⚡",
    category: "Integration Platform",
  },
  {
    name: "ADP",
    description: "Global payroll and HR management platform. Integration support for employee data sync and payroll processing.",
    status: "coming_soon" as const,
    icon: "/images/logos/adp-icon.png",
    fallbackIcon: "🌐",
    category: "Payroll",
  },
  {
    name: "NetSuite",
    description: "Oracle's cloud ERP and HR system. Integration support for employee and payroll data synchronisation.",
    status: "coming_soon" as const,
    icon: "/images/logos/netsuite-icon.png",
    fallbackIcon: "☁️",
    category: "ERP / Payroll",
  },
];

const STATUS_CONFIG = {
  available: {
    label: "Available",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  coming_soon: {
    label: "Coming Soon",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  beta: {
    label: "Beta",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
};

export default async function ClientConnectorsPage() {
  await requireAuth();

  return (
    <div className="min-h-full bg-[#F4F5F9]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-7 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Integrations
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Connector Library
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <Plug className="w-4 h-4" />
            Available integration connectors
          </div>
        </div>
      </div>

      <div className="px-7 py-6 space-y-6">
        {/* Intro */}
        <FadeIn>
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-8 text-white">
          <h2 className="text-[20px] font-bold mb-2">Integrations We Offer</h2>
          <p className="text-white/80 text-[14px] max-w-2xl">
            Digital Directions connects your HiBob HR platform to leading payroll and workforce
            management systems. Below are the connectors we currently support and what&apos;s coming next.
          </p>
        </div>

        </FadeIn>

        {/* Connector Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CONNECTORS.map((connector) => {
            const statusConfig = STATUS_CONFIG[connector.status];
            return (
              <StaggerItem key={connector.name}>
              <div
                className={cn(
                  "bg-white rounded-2xl border border-slate-100 p-6 transition-all",
                  connector.status === "available"
                    ? "hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5"
                    : "opacity-80"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                      {connector.fallbackIcon}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-800">
                        {connector.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">{connector.category}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      statusConfig.className
                    )}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <p className="text-[13px] text-slate-500 leading-relaxed">
                  {connector.description}
                </p>
              </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* CTA */}
        <FadeIn delay={0.3}>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
          <p className="text-[15px] font-semibold text-slate-700 mb-1">
            Need a connector not listed here?
          </p>
          <p className="text-[13px] text-slate-500">
            Reach out to your Digital Directions team to discuss custom integration options.
          </p>
        </div>
        </FadeIn>
      </div>
    </div>
  );
}
