"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Ticket,
    MessageSquare,
    Settings,
    Shield,
    HelpCircle,
    ChevronDown,
    ChevronLeft,
    ShieldCheck,
} from "lucide-react";

export function AdminSidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/dashboard/admin" && pathname === "/dashboard/admin") return true;
        if (href !== "/dashboard/admin" && pathname !== "/dashboard/admin" && pathname.startsWith(href)) return true;
        return false;
    };

    const navGroups = [
        {
            title: "GENERAL",
            items: [
                { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
                { label: "Clients", href: "/dashboard/admin/clients", icon: Users },
                { label: "Projects", href: "/dashboard/admin/projects", icon: FolderKanban },
                { label: "Tickets", href: "/dashboard/admin/tickets", icon: Ticket },
                { label: "Messages", href: "/dashboard/admin/messages", icon: MessageSquare, badge: "8" },
            ]
        },
        {
            title: "SYSTEM",
            items: [
                { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
                { label: "Security", href: "/dashboard/admin/security", icon: Shield },
                { label: "Help Center", href: "/dashboard/admin/help", icon: HelpCircle },
            ]
        }
    ];

    const renderNavItem = (item: any) => {
        const active = isActive(item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-[12px] text-[14px] font-medium transition-all duration-200 group",
                    active
                        ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(124,28,255,0.1)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                )}
            >
                <item.icon
                    strokeWidth={active ? 2 : 1.5}
                    className={cn(
                        "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                        active ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                    )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        item.badge === "BETA"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-primary/10 text-primary"
                    )}>
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <aside className="w-[260px] bg-[#0F1219] flex flex-col flex-shrink-0 h-full border-r border-white/[0.05]">
            {/* Digital Directions Brand Header */}
            <div className="px-6 py-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative h-8 w-40">
                        <Image
                            src="/images/logos/long_form_white_text.png"
                            alt="Digital Directions"
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>
                <button className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-8 pt-2">
                {navGroups.map((group) => (
                    <div key={group.title} className="space-y-2">
                        <h3 className="px-3 text-[11px] font-bold text-slate-600 tracking-[0.08em] uppercase">
                            {group.title}
                        </h3>
                        <nav className="space-y-1">
                            {group.items.map(renderNavItem)}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Account Section */}
            <div className="p-4 mx-4 mb-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500">Account Type</p>
                        <p className="text-sm font-bold text-white truncate">Administrator</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                </div>
            </div>

            {/* Version / Copyright */}
            <div className="px-6 py-4 border-t border-white/[0.05]">
                <p className="text-[11px] text-slate-600">@ 2024 Digital Directions</p>
            </div>
        </aside>
    );
}
