import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Ticket,
  Layers,
  ChevronsUpDown,
  Gem,
  BarChart2,
  Receipt,
  Zap,
  Settings,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

export async function Sidebar() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  const generalItems = isAdmin ? [
    { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/admin/clients", label: "Clients", icon: Users },
    { href: "/dashboard/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/admin/tickets", label: "Messages", icon: MessageSquare, badge: "8" },
  ] : [
    { href: "/dashboard/client", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/client/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/client/tickets", label: "Messages", icon: MessageSquare },
  ];

  const toolsItems = [
    { href: "#", label: "Analytics", icon: BarChart2 },
    { href: "#", label: "Invoices", icon: Receipt },
    { href: "#", label: "Automation", icon: Zap, secondaryBadge: "BETA" },
  ];

  const supportItems = [
    { href: "#", label: "Settings", icon: Settings },
    { href: "#", label: "Help Center", icon: HelpCircle },
  ];

  return (
    <aside className="w-[280px] bg-white border-r border-gray-100 flex flex-col py-6 px-5 z-20 flex-shrink-0 relative">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-10 group cursor-default">
        <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-200 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:rotate-12 group-hover:scale-110">
          <Layers className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-semibold tracking-tight text-gray-900 font-geist">Nexus</span>
        <span className="px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-medium text-gray-500 ml-auto group-hover:bg-gray-100 transition-colors">v2.0</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
        {/* General */}
        <div>
          <div className="px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">General</div>
          <nav className="space-y-1">
            {generalItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 justify-between",
                  "text-gray-500 hover:bg-gray-50 hover:text-gray-900 group"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all">{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Tools */}
        <div>
          <div className="px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Tools</div>
          <nav className="space-y-1">
            {toolsItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  "nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 justify-between",
                  "text-gray-500 hover:bg-gray-50 hover:text-gray-900 group"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
                  {item.label}
                </div>
                {item.secondaryBadge && (
                  <span className="text-[#6366F1] bg-[#6366F1]/10 text-[10px] font-semibold px-1.5 py-0.5 rounded animate-pulse-slow">{item.secondaryBadge}</span>
                )}
              </a>
            ))}
          </nav>
        </div>

        {/* Support */}
        <div>
          <div className="px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Support</div>
          <nav className="space-y-1">
            {supportItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  "nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
                  "text-gray-500 hover:bg-gray-50 hover:text-gray-900 group"
                )}
              >
                <item.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Team / Plan section */}
      <div className="mt-auto pt-6">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-indigo-100 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Gem className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-medium">Team</span>
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                Digital Directions
              </span>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-auto cursor-pointer hover:text-gray-600 transition-colors" />
          </div>
          <button className="btn-press w-full bg-white border border-gray-200 text-gray-900 font-medium text-xs py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
            Upgrade Plan
          </button>
        </div>
        <div className="mt-4 text-center">
          <span className="text-[10px] text-gray-400">© 2024 Nexus.io, Inc.</span>
        </div>
      </div>
    </aside>
  );
}
