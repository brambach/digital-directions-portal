"use client";

import { ClientSidebar } from "./client-sidebar";
import { ClientHeader } from "./client-header";

interface ClientShellProps {
    children: React.ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#f3f4f6]">
            {/* Sidebar */}
            <div className="hidden lg:block h-full">
                <ClientSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white relative">
                <ClientHeader />
                {children}
            </main>
        </div>
    );
}
