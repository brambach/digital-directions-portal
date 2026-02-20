"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DijiMascot } from "@/components/diji-mascot";
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group",
                    active
                        ? "bg-violet-50 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
            >
                <item.icon
                    strokeWidth={active ? 2 : 1.75}
                    className={cn(
                        "w-[17px] h-[17px] flex-shrink-0 transition-colors",
                        active ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"
                    )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        item.badge === "BETA"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-violet-100 text-violet-600"
                    )}>
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <aside className="w-[240px] bg-white flex flex-col flex-shrink-0 h-full border-r border-slate-100">
            {/* Brand Header */}
            <div className="px-5 py-6 flex items-center">
                <div className="relative h-7 w-36">
                    <Image
                        src="/images/logos/long_form_purple_text.png"
                        alt="Digital Directions"
                        fill
                        className="object-contain object-left"
                    />
                </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-slate-100 mb-4" />

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-6 pt-1">
                {navGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        <h3 className="px-3 text-[10.5px] font-semibold text-slate-400 tracking-[0.07em] uppercase mb-2">
                            {group.title}
                        </h3>
                        <nav className="space-y-0.5">
                            {group.items.map(renderNavItem)}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Account Section */}
            <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">Account Type</p>
                        <p className="text-[13px] font-semibold text-slate-700 truncate">Administrator</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 flex flex-col items-center gap-2">
                <DijiMascot variant="neutral" size="xs" />
                <p className="text-[11px] text-slate-400">&copy; 2025 Digital Directions</p>
            </div>
        </aside>
    );
}
