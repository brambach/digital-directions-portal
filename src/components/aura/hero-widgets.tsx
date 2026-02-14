"use client";

import { cn } from "@/lib/utils";
import {
    Users,
    TrendingUp,
    Briefcase,
    TrendingDown,
    CheckCircle,
    BarChart,
    Clock,
    ChevronDown,
    PieChart,
    List,
    Layers,
    Search,
    Gift,
    Bell,
    PlusCircle,
    Calendar,
    Filter,
    Download,
} from "lucide-react";

export function AuraStatsCard({
    type,
    className,
}: {
    type: "clients" | "projects" | "tasks";
    className?: string;
}) {
    const data = {
        clients: {
            icon: Users,
            label: "Total Clients",
            value: "4,250",
            trend: "15.8%",
            trendUp: true,
            color: "violet",
            bgClass: "bg-white border-slate-200",
            iconBg: "bg-violet-50 border-violet-100 text-violet-700",
        },
        projects: {
            icon: Briefcase,
            label: "Active Projects",
            value: "12",
            trend: "4.2%",
            trendUp: false,
            color: "violet",
            bgClass: "bg-white border-slate-200",
            iconBg: "bg-violet-50 border-violet-100 text-violet-700",
        },
        tasks: {
            icon: CheckCircle,
            label: "Pending Tasks",
            value: "203",
            trend: "24.2%",
            trendUp: true,
            color: "emerald",
            bgClass: "bg-white border-slate-200",
            iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
        },
    }[type];

    // Manual color overrides for the gradients if needed, but using styles for now
    const gradientColor =
        type === "clients"
            ? "from-violet-100/50"
            : type === "projects"
                ? "from-violet-100/50"
                : "from-emerald-50";

    return (
        <div
            className={cn(
                "relative flex flex-col justify-between p-6 rounded-2xl border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                data.bgClass,
                className
            )}
        >
            <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg border", data.iconBg)}>
                        <data.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                        {data.label}
                    </span>
                </div>
            </div>
            <div className="z-10 mt-4">
                <div className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    {data.value}
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1",
                            data.trendUp
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-red-50 text-red-600 border-red-100"
                        )}
                    >
                        {data.trendUp ? (
                            <TrendingUp className="w-3 h-3" />
                        ) : (
                            <TrendingDown className="w-3 h-3" />
                        )}
                        {data.trend}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">vs last month</span>
                </div>
            </div>
            {/* Decorative Gradient */}
            <div
                className={cn(
                    "absolute right-0 bottom-0 w-32 h-32 bg-gradient-to-tl to-transparent rounded-full translate-y-10 translate-x-10",
                    gradientColor
                )}
            />
        </div>
    );
}

export function AuraActivityChart({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col w-full max-w-md",
                className
            )}
        >
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-500">
                            Work Analysis
                        </h3>
                    </div>
                    <div className="text-2xl font-semibold text-gray-900 tracking-tight">
                        $9,257.51
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-4 px-2 min-h-[180px]">
                {/* Bar 1 */}
                <div className="flex flex-col items-center gap-3 w-full group cursor-pointer">
                    <div className="w-full max-w-[40px] flex flex-col gap-1 items-center h-[180px] justify-end">
                        <div className="w-full h-[15%] bg-violet-700 rounded-md opacity-80" />
                        <div className="w-full h-[25%] bg-violet-500 rounded-md opacity-80" />
                        <div className="w-full h-[20%] bg-violet-400 rounded-md opacity-80" />
                        <div className="w-full h-[10%] bg-violet-300 rounded-md opacity-80" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Oct</span>
                </div>
                {/* Bar 2 */}
                <div className="flex flex-col items-center gap-3 w-full group cursor-pointer">
                    <div className="w-full max-w-[40px] flex flex-col gap-1 items-center h-[180px] justify-end">
                        <div className="w-full h-[10%] bg-slate-600 rounded-md opacity-80" />
                        <div className="w-full h-[15%] bg-slate-500 rounded-md opacity-80" />
                        <div className="w-full h-[10%] bg-slate-400 rounded-md opacity-80" />
                        <div className="w-full h-[12%] bg-slate-300 rounded-md opacity-80" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Nov</span>
                </div>
                {/* Bar 3 */}
                <div className="flex flex-col items-center gap-3 w-full group cursor-pointer">
                    <div className="w-full max-w-[40px] flex flex-col gap-1 items-center h-[180px] justify-end">
                        <div className="w-full h-[20%] bg-violet-700 rounded-md shadow-lg shadow-violet-200" />
                        <div className="w-full h-[30%] bg-violet-500 rounded-md" />
                        <div className="w-full h-[25%] bg-violet-400 rounded-md" />
                        <div className="w-full h-[15%] bg-violet-300 rounded-md" />
                    </div>
                    <span className="text-xs text-gray-900 font-semibold scale-110">
                        Dec
                    </span>
                </div>
            </div>
        </div>
    );
}

export function AuraDonutChart({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden w-full max-w-sm",
                className
            )}
        >
            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-500">Distribution</h3>
                </div>
            </div>

            <div className="flex justify-between items-end mb-8 z-10">
                <div>
                    <span className="text-[10px] text-violet-700 font-semibold tracking-wide uppercase">
                        Ent
                    </span>
                    <div className="text-xl font-medium text-gray-900 mt-0.5">
                        $374
                    </div>
                </div>
                <div>
                    <span className="text-[10px] text-slate-600 font-semibold tracking-wide uppercase">
                        Start
                    </span>
                    <div className="text-xl font-medium text-gray-900 mt-0.5">
                        $241
                    </div>
                </div>
                <div>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                        Other
                    </span>
                    <div className="text-xl font-medium text-gray-900 mt-0.5">
                        $213
                    </div>
                </div>
            </div>

            <div className="flex justify-center -mb-16">
                <div className="relative w-64 h-32 overflow-hidden">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                        <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="12"
                            strokeLinecap="round"
                        />
                        <path
                            className="animate-stroke delay-300"
                            d="M 10 50 A 40 40 0 0 1 40 12"
                            fill="none"
                            stroke="#6d28d9"
                            strokeWidth="12"
                            strokeDasharray="251"
                            strokeDashoffset="251"
                            strokeLinecap="round"
                        />
                        <path
                            className="animate-stroke delay-500"
                            d="M 42 11 A 40 40 0 0 1 75 25"
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="12"
                            strokeDasharray="251"
                            strokeDashoffset="251"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}

export function AuraTaskList({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col w-full max-w-sm",
                className
            )}
        >
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-500">
                        Priority Tickets
                    </h3>
                </div>
            </div>
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                    >
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-700">
                            <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                                RetailCo Update
                            </div>
                            <div className="text-xs text-gray-500">Finance Module</div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">$650</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
