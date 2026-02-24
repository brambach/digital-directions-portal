"use client";

import { useState, useRef, useEffect } from "react";
import { Search, LogOut, User } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { NotificationBell } from "@/components/notification-bell";

export function ClientHeader() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const displayName = user?.fullName || "Client User";
    const email = user?.primaryEmailAddress?.emailAddress || "";
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    return (
        <header className="h-[60px] flex items-center justify-between px-6 border-b border-slate-100 bg-white z-30 flex-shrink-0 sticky top-0">
            {/* Left: Search */}
            <div className="flex items-center gap-3 flex-1 max-w-sm">
                <div className="relative group w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search projects, tickets..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 rounded-lg text-[13px] text-slate-700 placeholder:text-slate-400 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-1">
                <NotificationBell />

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 mx-2" />

                {/* User Avatar + Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className="flex items-center gap-2.5 cursor-pointer group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-[13px] font-semibold text-slate-700 leading-tight">{displayName}</p>
                            <p className="text-[11px] text-slate-400 leading-tight">Client</p>
                        </div>
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-violet-100 border-2 border-white ring-1 ring-slate-200 transition-all group-hover:ring-violet-300">
                            {user?.imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={user.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-violet-700 text-sm font-bold">
                                    {displayName.charAt(0)}
                                </div>
                            )}
                        </div>
                    </button>

                    {/* Dropdown */}
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="px-3 py-2.5 border-b border-slate-100">
                                <p className="text-[13px] font-semibold text-slate-900 truncate">{displayName}</p>
                                <p className="text-[11px] text-slate-400 truncate">{email}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    signOut({ redirectUrl: "/sign-in" });
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
