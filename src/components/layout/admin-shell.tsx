"use client";

import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

interface AdminShellProps {
    children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#f3f4f6]">
            {/* Sidebar */}
            <div className="hidden lg:block h-full">
                <AdminSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white relative">
                <AdminHeader />
                {children}
            </main>
        </div>
    );
}
