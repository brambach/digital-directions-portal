"use client";

import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

interface AdminShellProps {
    children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#F4F5F9]">
            {/* Sidebar */}
            <div className="hidden lg:block h-full">
                <AdminSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto no-scrollbar relative flex flex-col">
                <AdminHeader />
                {children}
            </main>
        </div>
    );
}
