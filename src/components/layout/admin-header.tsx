import { Search, Bell, Gift, Plus, ChevronDown } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function AdminHeader() {
    const { user } = useUser();
    const displayName = user?.fullName || "Admin User";
    const userEmail = user?.primaryEmailAddress?.emailAddress || "admin@digitaldirections.io";

    return (
        <header className="h-[72px] flex items-center justify-between px-8 border-b border-white/[0.05] bg-[#0B0E14]/80 backdrop-blur-md z-30 flex-shrink-0 sticky top-0">
            {/* Left: Optional Page Title or Logo extension */}
            <div className="flex-1 lg:flex-none">
                <h1 className="text-xl font-bold text-white tracking-tight">Overview</h1>
            </div>

            {/* Middle: Centered Search */}
            <div className="hidden md:flex flex-1 justify-center max-w-2xl px-8">
                <div className="relative group w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors duration-200" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-10 pr-12 py-2 bg-white/[0.03] border border-white/[0.05] focus:bg-white/[0.07] focus:border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.05] text-[10px] text-slate-400 font-mono pointer-events-none">
                        ⌘ + F
                    </div>
                </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 mr-2">
                    <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <Gift className="w-[20px] h-[20px]" />
                    </button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors relative">
                        <Bell className="w-[20px] h-[20px]" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-[#0B0E14] rounded-full"></span>
                    </button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <Plus className="w-[20px] h-[20px]" />
                    </button>
                </div>

                <div className="h-8 w-px bg-white/[0.05] hidden sm:block mx-2" />

                {/* User Info */}
                <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-bold text-white leading-tight">{displayName}</p>
                        <p className="text-[11px] font-medium text-slate-500 leading-tight">Business</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-white/10 transition-transform group-hover:scale-105 duration-200">
                        {user?.imageUrl ? (
                            <img src={user.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                {displayName.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
