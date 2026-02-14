"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    MessageSquare,
    Settings,
    HelpCircle,
    Gem,
} from "lucide-react";

export function AdminSidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        // Exact match for dashboard home
        if (href === "/dashboard/admin" && pathname === "/dashboard/admin") return true;
        // Partial match for sub-routes
        if (href !== "/dashboard/admin" && pathname.startsWith(href)) return true;
        return false;
    };

    const navItemClass = (href: string) => cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative",
        isActive(href)
            ? "bg-violet-50 text-violet-700 shadow-sm shadow-violet-100/50"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    );

    const iconClass = (href: string) => cn(
        "w-4 h-4 transition-colors duration-200",
        isActive(href) ? "text-violet-700" : "text-gray-400 group-hover:text-gray-900"
    );

    return (
        <aside className="w-[280px] bg-white border-r border-gray-100 flex flex-col py-6 px-5 z-20 flex-shrink-0 relative h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2 mb-10 group cursor-pointer">
                <Image
                    src="/images/dd-logo.png"
                    alt="Digital Directions"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-lg transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-110"
                />
                <span className="text-xl font-semibold tracking-tight text-gray-900">Digital Directions</span>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">

                {/* General Section */}
                <div>
                    <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">General</div>
                    <nav className="space-y-1">
                        <Link href="/dashboard/admin" className={navItemClass("/dashboard/admin")}>
                            <LayoutDashboard className={iconClass("/dashboard/admin")} />
                            Dashboard
                        </Link>
                        <Link href="/dashboard/admin/clients" className={navItemClass("/dashboard/admin/clients")}>
                            <Users className={iconClass("/dashboard/admin/clients")} />
                            Clients
                        </Link>
                        <Link href="/dashboard/admin/projects" className={navItemClass("/dashboard/admin/projects")}>
                            <FolderKanban className={iconClass("/dashboard/admin/projects")} />
                            Projects
                        </Link>
                        <Link href="/dashboard/admin/messages" className={navItemClass("/dashboard/admin/messages")}>
                            <div className="flex items-center gap-3">
                                <MessageSquare className={iconClass("/dashboard/admin/messages")} />
                                Messages
                            </div>
                        </Link>
                    </nav>
                </div>

                {/* Support Section */}
                <div>
                    <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Support</div>
                    <nav className="space-y-1">
                        <Link href="/dashboard/admin/settings" className={navItemClass("/dashboard/admin/settings")}>
                            <Settings className={iconClass("/dashboard/admin/settings")} />
                            Settings
                        </Link>
                        <Link href="/dashboard/admin/tickets" className={navItemClass("/dashboard/admin/tickets")}>
                            <HelpCircle className={iconClass("/dashboard/admin/help")} />
                            Help Center
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Team Info */}
            <div className="mt-auto pt-6">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-700 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-violet-200">
                            <Gem className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">Team</span>
                            <span className="text-sm font-semibold text-gray-900">Digital Directions</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <span className="text-[10px] text-gray-400">© 2026 Digital Directions</span>
                </div>
            </div>
        </aside >
    );
}
