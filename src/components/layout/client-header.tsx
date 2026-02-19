"use client";

import { Search, Gift, Bell, PlusCircle } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NotificationBell } from "@/components/notification-bell";

export function ClientHeader() {
    return (
        <header className="h-20 flex items-center justify-between px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md z-30 flex-shrink-0 sticky top-0">
            {/* Search */}
            <div className="relative group hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-700 transition-colors duration-300" />
                <input
                    type="text"
                    placeholder="Search Projects"
                    className="pl-10 pr-4 py-2.5 w-80 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl text-sm outline-none transition-all duration-300 placeholder:text-gray-400 text-gray-600 focus:w-96 focus:shadow-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50 group-focus-within:opacity-100 transition-opacity">
                    <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">⌘</span>
                    <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">K</span>
                </div>
            </div>

            {/* Mobile Title (visible if search is hidden) */}
            <div className="md:hidden font-semibold text-gray-900">Portal</div>

            {/* Right Tools */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <NotificationBell />
                </div>

                <div className="h-8 w-px bg-gray-100 hidden sm:block"></div>

                <div className="flex items-center gap-3 pl-2">
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "w-9 h-9 rounded-full border border-gray-200 shadow-sm transition-shadow hover:shadow-md"
                            }
                        }}
                    />
                    <div className="hidden lg:flex flex-col items-start">
                        <span className="text-sm font-semibold text-gray-900">Client Account</span>
                        <span className="text-[10px] text-gray-500 font-medium">Standard Access</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
