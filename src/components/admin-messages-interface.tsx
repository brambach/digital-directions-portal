"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Phone, Video, MoreHorizontal, Send, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

interface Project {
    id: string;
    name: string;
    clientName: string;
    updatedAt: Date;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderAvatar: string | null;
    senderRole: string;
    createdAt: string;
    read: boolean;
}

export function AdminMessagesInterface({ projects, currentUserId }: { projects: Project[], currentUserId: string }) {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    useEffect(() => {
        if (selectedProjectId) {
            fetchMessages(selectedProjectId);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async (projectId: string) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/messages?projectId=${projectId}&limit=50`);
            if (res.ok) {
                const data = await res.json();
                // API returns messages in descending order (newest first), but we want to display them oldest to newest
                setMessages(data.messages.reverse());
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedProjectId) return;

        setSending(true);
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: messageInput,
                    projectId: selectedProjectId,
                }),
            });

            if (res.ok) {
                const newMessage = await res.json();
                const enrichedMessage = {
                    ...newMessage,
                    senderName: "Me", // Optimistic update, real name comes on refresh or if we returned it from API
                    createdAt: new Date().toISOString(),
                    // We'll rely on the API to give us the full object if possible, but the POST returns the basic DB object.
                    // For now, let's just append it.
                    senderConfirmation: true
                };
                setMessages((prev) => [...prev, enrichedMessage]);
                setMessageInput("");
                // Ideally we'd re-fetch to get correct user details, but for now this is fine.
                fetchMessages(selectedProjectId); // quick refresh to be safe
            } else {
                toast.error("Failed to send message");
            }
        } catch (error) {
            console.error("Error sending message", error);
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex-1 flex overflow-hidden bg-[#F9FAFB] font-geist h-[calc(100vh-5rem)]">
            {/* Sidebar List */}
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-100 transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={cn(
                                "p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 flex gap-3",
                                selectedProjectId === project.id ? "bg-violet-50/40" : ""
                            )}
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-violet-100">
                                    {project.name.charAt(0)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <span className="font-semibold text-sm text-gray-900 truncate">{project.name}</span>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                        {new Date(project.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500 truncate">{project.clientName}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProjects.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">No projects found</div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#F9FAFB]">
                {selectedProject ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold shadow-sm">
                                    {selectedProject.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">{selectedProject.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium">{selectedProject.clientName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-gray-400">
                                <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" aria-label="Start voice call"><Phone className="w-5 h-5" /></button>
                                <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" aria-label="Start video call"><Video className="w-5 h-5" /></button>
                                <button className="p-2 hover:bg-gray-50 rounded-full transition-colors" aria-label="More options"><MoreHorizontal className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-700"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                        <Send className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium">No messages yet</p>
                                    <p className="text-xs">Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    // Check if sender is me (could be checked by ID if available, here simple check)
                                    // The API returns senderId. We passed currentUserId prop.
                                    const isMe = msg.senderId === currentUserId;

                                    return (
                                        <div key={msg.id || idx} className={cn("flex gap-4 max-w-[80%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                                            {!isMe && (
                                                msg.senderAvatar ? (
                                                    <Image src={msg.senderAvatar} alt={msg.senderName} width={32} height={32} className="rounded-full object-cover w-8 h-8 self-end" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold self-end shrink-0">
                                                        {msg.senderName?.charAt(0) || "?"}
                                                    </div>
                                                )
                                            )}

                                            {isMe && (
                                                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-[10px] font-bold self-end shrink-0">ME</div>
                                            )}

                                            <div>
                                                <div className={cn(
                                                    "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                                                    isMe
                                                        ? "bg-violet-700 text-white rounded-br-sm shadow-violet-200"
                                                        : "bg-white border border-gray-100 rounded-bl-sm text-gray-600"
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] text-gray-400 font-medium mt-1 block",
                                                    isMe ? "text-right mr-1" : "ml-1"
                                                )}>
                                                    {!isMe && <span className="mr-2 text-gray-500">{msg.senderName}</span>}
                                                    {msg.createdAt && formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <form onSubmit={handleSendMessage}>
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-violet-100 focus-within:border-violet-200 transition-all">
                                    <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-gray-900 placeholder:text-gray-400"
                                        disabled={sending}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !messageInput.trim()}
                                        className="p-2 bg-violet-700 text-white rounded-xl shadow-sm hover:bg-violet-800 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                            <div className="flex justify-between items-center mt-2 px-1">
                                <p className="text-[10px] text-gray-400">Press <b>Enter</b> to send</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Search className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium">Select a project to view messages</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
