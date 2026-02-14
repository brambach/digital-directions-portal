import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import React from "react";

export interface StatCardProps {
    label: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    icon?: React.ReactNode;
    period?: string;
    variant?: "white" | "emerald" | "violet";
}

export function StatCard({ label, value, trend, trendUp, icon, period = "vs last month", variant = "white" }: StatCardProps) {
    const variants: any = {
        emerald: "bg-emerald-50/50 border-emerald-100/50",
        violet: "bg-violet-50/50 border-violet-100/50",
        white: "bg-white border-slate-100"
    };

    const iconBgVariants: any = {
        emerald: "bg-emerald-100/60 border-emerald-200/50 group-hover:bg-emerald-100",
        violet: "bg-violet-100/60 border-violet-200/50 group-hover:bg-violet-100",
        white: "bg-slate-50 border-slate-100 group-hover:bg-slate-100"
    };

    return (
        <Card className={cn(
            "p-6 shadow-sm rounded-xl group hover-card relative overflow-hidden transition-all duration-300 border",
            variants[variant] || variants.white
        )}>
            <div className="flex justify-between items-start z-10 relative mb-4">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-lg border transition-colors",
                        iconBgVariants[variant] || iconBgVariants.white
                    )}>
                        {icon || <Users className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-medium text-gray-500">{label}</span>
                </div>
            </div>

            <div className="z-10 relative">
                <div className="text-3xl font-bold tracking-tight text-gray-900 mb-2">{value}</div>
                {(trend || period) && (
                    <div className="flex items-center gap-2">
                        {trend && (
                            <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1",
                                trendUp ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                            )}>
                                {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trend}
                            </span>
                        )}
                        {period && <span className="text-xs text-gray-400 font-medium group-hover:text-gray-500 transition-colors">{period}</span>}
                    </div>
                )}
            </div>

            {/* Decorative Gradient Blob */}
            <div className={cn(
                "absolute right-0 bottom-0 w-32 h-32 rounded-full translate-y-10 translate-x-10 transition-transform duration-500 group-hover:scale-125",
                variant === 'emerald' ? "bg-gradient-to-tl from-emerald-100/50 to-transparent" :
                    variant === 'violet' ? "bg-gradient-to-tl from-violet-100/50 to-transparent" :
                        "bg-gradient-to-tl from-slate-50 to-transparent"
            )}></div>
        </Card>
    );
}
