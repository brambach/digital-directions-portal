import { UserButton } from "@clerk/nextjs";
import { getUserWithProfile } from "@/lib/auth";
import { Search, Gift, Bell, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export async function Header() {
  const user = await getUserWithProfile();

  return (
    <header className="h-20 flex items-center justify-between px-8 border-b border-gray-100 bg-white/80 backdrop-blur-md z-30 flex-shrink-0 sticky top-0">
      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-700 transition-colors" />
        <input
          type="text"
          placeholder="Search"
          className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-100 rounded-xl text-sm outline-none transition-all duration-300 placeholder:text-gray-400 text-gray-900 border-gray-50 group-focus-within:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)]"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-focus-within:opacity-0 transition-opacity">
          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">⌘</span>
          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">F</span>
        </div>
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button className="btn-press text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-50">
            <Gift className="w-5 h-5 stroke-[1.5]" />
          </button>
          <button className="btn-press text-gray-400 hover:text-gray-600 transition-colors relative p-2 rounded-full hover:bg-gray-50">
            <div className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></div>
            <Bell className="w-5 h-5 stroke-[1.5]" />
          </button>
          <button className="btn-press text-gray-400 hover:text-purple-700 transition-colors p-2 rounded-full hover:bg-purple-50">
            <PlusCircle className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        <div className="h-8 w-px bg-gray-100"></div>

        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-900 font-geist leading-tight">
              {user?.name || "User"}
            </span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              {user?.role === 'admin' ? 'Consultant' : 'Business Plan'}
            </span>
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9 h-9 rounded-full border border-gray-200 shadow-sm transition-shadow hover:shadow-md"
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
