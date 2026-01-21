import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import React from "react";

interface StatCardProps {
    label: string;
    value: string | number;
    trend: string;
    trendUp: boolean;
    icon?: React.ReactNode;
    period?: string;
    variant?: "cyan" | "indigo" | "white" | "emerald";
}

export function StatCard({ label, value, trend, trendUp, icon, period = "vs last month", variant = "white" }: StatCardProps) {
    const variants: any = {
        cyan: "bg-gradient-to-br from-[#06B6D4]/5 to-white border-[#06B6D4]/20",
        indigo: "bg-gradient-to-br from-[#6366F1]/5 to-white border-[#6366F1]/20",
        emerald: "bg-gradient-to-br from-emerald-500/5 to-white border-emerald-500/20",
        white: "bg-white border-gray-100"
    };

    const iconBgVariants: any = {
        cyan: "bg-[#06B6D4]/10 border-[#06B6D4]/20 group-hover:bg-[#06B6D4]/20",
        indigo: "bg-[#6366F1]/10 border-[#6366F1]/20 group-hover:bg-[#6366F1]/20",
        emerald: "bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20",
        white: "bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100"
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
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1",
                        trendUp ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                        {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trend}
                    </span>
                    <span className="text-xs text-gray-400 font-medium group-hover:text-gray-500 transition-colors">{period}</span>
                </div>
            </div>

            {/* Decorative Gradient Blob */}
            <div className={cn(
                "absolute right-0 bottom-0 w-32 h-32 rounded-full translate-y-10 translate-x-10 transition-transform duration-500 group-hover:scale-125",
                variant === 'cyan' ? "bg-gradient-to-tl from-[#06B6D4]/10 to-transparent" :
                    variant === 'indigo' ? "bg-gradient-to-tl from-[#6366F1]/10 to-transparent" :
                        variant === 'emerald' ? "bg-gradient-to-tl from-emerald-500/10 to-transparent" :
                            "bg-gradient-to-tl from-emerald-50 to-transparent"
            )}></div>
        </Card>
    );
}
