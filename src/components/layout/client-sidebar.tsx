"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    FolderKanban,
    Ticket,
    MessageSquare,
    HelpCircle,
    Calculator,
    Plug,
} from "lucide-react";

export function ClientSidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/dashboard/client" && pathname === "/dashboard/client") return true;
        if (href !== "/dashboard/client" && pathname !== "/dashboard/client" && pathname.startsWith(href)) return true;
        return false;
    };

    const navGroups = [
        {
            title: "GENERAL",
            items: [
                { label: "Dashboard", href: "/dashboard/client", icon: LayoutDashboard },
                { label: "Projects", href: "/dashboard/client/projects", icon: FolderKanban },
                { label: "Tickets", href: "/dashboard/client/tickets", icon: Ticket },
                { label: "Messages", href: "/dashboard/client/messages", icon: MessageSquare },
            ]
        },
        {
            title: "TOOLS",
            items: [
                { label: "ROI Calculator", href: "/dashboard/client/roi", icon: Calculator },
                { label: "Connectors", href: "/dashboard/client/connectors", icon: Plug },
            ]
        },
        {
            title: "SUPPORT",
            items: [
                { label: "Help Centre", href: "/dashboard/client/help", icon: HelpCircle },
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
            </Link>
        );
    };

    return (
        <aside className="w-[240px] bg-white flex flex-col flex-shrink-0 h-full border-r border-slate-100">
            {/* Brand Header */}
            <div className="px-5 py-6 flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/images/logos/long_form_purple_text.png"
                    alt="Digital Directions"
                    className="h-7 w-36 object-contain object-left"
                />
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

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-center">
                <p className="text-[11px] text-slate-400">&copy; 2025 Digital Directions</p>
            </div>
        </aside>
    );
}
