"use client";

import { ClientSidebar } from "./client-sidebar";
import { ClientHeader } from "./client-header";

interface ClientShellProps {
    children: React.ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#F4F5F9]">
            {/* Sidebar */}
            <div className="hidden lg:block h-full">
                <ClientSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto no-scrollbar relative">
                {children}
            </main>
        </div>
    );
}
