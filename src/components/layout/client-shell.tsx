"use client";

import { ClientSidebar } from "./client-sidebar";
import { ClientHeader } from "./client-header";
import { TourOverlay } from "@/components/guided-tour/tour-overlay";
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

            {/* Guided Tour — must render BEFORE DigiChat for effect ordering */}
            <TourOverlay hasProjects={Boolean(chatProps?.projects?.length)} />

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
