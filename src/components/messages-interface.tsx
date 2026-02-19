"use client";

import { useState, useEffect, useRef } from "react";
import {
    Search,
    Phone,
    Video,
    MoreHorizontal,
    Send,
    Paperclip,
    Smile,
    Image as ImageIcon,
    Archive,
    User,
    MoreVertical
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface MessagesInterfaceProps {
    projects: Project[];
    currentUserId: string;
    userRole: "admin" | "client";
}

export function MessagesInterface({ projects, currentUserId, userRole }: MessagesInterfaceProps) {
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
                    senderName: "Me",
                    createdAt: new Date().toISOString(),
                    senderConfirmation: true
                };
                setMessages((prev) => [...prev, enrichedMessage]);
                setMessageInput("");
                fetchMessages(selectedProjectId);
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

    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        if (isToday(date)) return format(date, "h:mm a");
        if (isYesterday(date)) return "Yesterday " + format(date, "h:mm a");
        return format(date, "MMM d, h:mm a");
    };

    const formatListTime = (date: Date) => {
        return formatDistanceToNowStrict(date, { addSuffix: true });
    };

    // Group messages by date for separators
    const groupedMessages = messages.reduce((acc, msg) => {
        const date = new Date(msg.createdAt).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(msg);
        return acc;
    }, {} as Record<string, Message[]>);

    return (
        <div className="flex-1 flex overflow-hidden bg-white font-geist h-[calc(100vh-5rem)]">
            {/* LEFT SIDEBAR */}
            <div className="w-[350px] border-r border-gray-100 bg-white flex flex-col">
                {/* Sidebar Header */}
                <div className="p-6 pb-2">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-200">
                            <span className="sr-only">New Message</span>
                            <Paperclip className="h-4 w-4 text-gray-500" />
                        </Button>
                    </div>

                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search messages"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-200 transition-all placeholder:text-gray-400"
                        />
                    </div>
                </div>

                {/* Project List */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={cn(
                                "p-3 rounded-xl cursor-pointer transition-all duration-200 group relative",
                                selectedProjectId === project.id
                                    ? "bg-gray-50"
                                    : "hover:bg-gray-50/50"
                            )}
                        >
                            {/* Selection Indicator Line */}
                            {selectedProjectId === project.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-purple-700 rounded-r-full" />
                            )}

                            <div className="flex gap-3 pl-2">
                                <div className="relative flex-shrink-0">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white",
                                        selectedProjectId === project.id ? "bg-purple-700" : "bg-gray-900"
                                    )}>
                                        {project.name.charAt(0)}
                                    </div>
                                    {/* Status Dot (Fake for now, implies project activity) */}
                                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <span className={cn(
                                            "font-semibold text-sm truncate",
                                            selectedProjectId === project.id ? "text-gray-900" : "text-gray-700"
                                        )}>
                                            {project.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                            {formatListTime(new Date(project.updatedAt))}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-purple-700 font-medium truncate">@{project.clientName.replace(/\s+/g, '').toLowerCase()}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {project.id === selectedProjectId ? "View conversation..." : "Click to view messages"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredProjects.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">No conversations found</div>
                    )}
                </div>
            </div>

            {/* RIGHT CHAT AREA */}
            <div className="flex-1 flex flex-col bg-white border-l border-gray-100">
                {selectedProject ? (
                    <>
                        {/* Header */}
                        <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 bg-white">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                                        {selectedProject.name.charAt(0)}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 text-lg">{selectedProject.name}</h2>
                                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                        Active now
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="text-gray-500 font-semibold rounded-xl h-9">
                                    <Archive className="w-4 h-4 mr-2" />
                                    Archive
                                </Button>
                                <Button size="sm" className="font-semibold rounded-xl h-9 shadow-sm">
                                    View profile
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 bg-white">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                        <Send className="w-8 h-8 text-gray-300 ml-1" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-900 font-semibold text-lg">No messages yet</p>
                                        <p className="text-gray-500">Break the ice and start the conversation!</p>
                                    </div>
                                </div>
                            ) : (
                                Object.entries(groupedMessages).map(([date, msgs]) => (
                                    <div key={date} className="space-y-6">
                                        {/* Date Separator */}
                                        <div className="flex items-center justify-center">
                                            <div className="bg-gray-50 text-gray-500 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
                                                {isToday(new Date(date)) ? "Today" : isYesterday(new Date(date)) ? "Yesterday" : date}
                                            </div>
                                        </div>

                                        {msgs.map((msg, idx) => {
                                            const isMe = msg.senderId === currentUserId;
                                            return (
                                                <div key={msg.id || idx} className={cn("flex gap-4 max-w-[75%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                                                    {/* Avatar */}
                                                    <div className="flex-shrink-0 self-end">
                                                        {isMe ? (
                                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-[10px] font-bold">ME</div>
                                                        ) : (
                                                            msg.senderAvatar ? (
                                                                <Image src={msg.senderAvatar} alt={msg.senderName} width={32} height={32} className="rounded-full object-cover w-8 h-8 border border-gray-100" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-[10px] font-bold">
                                                                    {msg.senderName?.charAt(0) || "?"}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={cn("text-sm font-semibold", isMe ? "text-right ml-auto" : "")}>
                                                                {isMe ? "You" : msg.senderName}
                                                            </span>
                                                            <span className="text-xs text-gray-400">{format(new Date(msg.createdAt), "h:mm a")}</span>
                                                        </div>

                                                        <div className={cn(
                                                            "px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                                                            isMe
                                                                ? "bg-purple-700 text-white rounded-tr-sm"
                                                                : "bg-white border border-gray-200 text-gray-700 rounded-tl-sm"
                                                        )}>
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="relative">
                                <div className="border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all bg-white overflow-hidden">
                                    <textarea
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        placeholder="Send a message..."
                                        className="w-full min-h-[50px] max-h-[150px] p-4 text-sm text-gray-900 placeholder:text-gray-400 border-none outline-none resize-none bg-transparent"
                                        rows={1}
                                    />

                                    <div className="flex items-center justify-between px-3 pb-3 pt-1">
                                        <div className="flex items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                                                <Paperclip className="h-4 w-4" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                                                <ImageIcon className="h-4 w-4" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                                                <Smile className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={sending || !messageInput.trim()}
                                            className="bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg px-4 h-9 shadow-sm transition-all disabled:opacity-50"
                                        >
                                            {sending ? "Sending..." : "Send"}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                            <div className="text-center mt-3">
                                <p className="text-xs text-gray-400">
                                    <strong>Pro tip:</strong> press <span className="font-semibold bg-gray-100 px-1 py-0.5 rounded text-gray-600">Enter</span> to send
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                        <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-sm">
                            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                                <Search className="w-7 h-7 text-purple-700" />
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg mb-2">Select a Conversation</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">Choose a project from the sidebar to start messaging with the team or viewing project updates.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
