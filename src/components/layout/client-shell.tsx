"use client";

import { ClientSidebar } from "./client-sidebar";
import { ClientHeader } from "./client-header";
import { DigiChat } from "@/components/digi-chat/digi-chat";

interface ClientShellProps {
    children: React.ReactNode;
    chatProps?: {
        clientId: string;
        projects: Array<{ id: string; name: string }>;
    };
}

export default function ClientShell({ children, chatProps }: ClientShellProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#F4F5F9]">
            {/* Sidebar */}
            <div className="hidden lg:block h-full">
                <ClientSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto no-scrollbar relative flex flex-col">
                <ClientHeader />
                {children}
            </main>

            {/* Digi AI Chat */}
            {chatProps && (
                <DigiChat
                    clientId={chatProps.clientId}
                    projects={chatProps.projects}
                />
            )}
        </div>
    );
}
