"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/lib/chat/types";
import { ChatBubble } from "./chat-bubble";
import { ChatPanel } from "./chat-panel";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { EscalationBanner } from "./escalation-banner";

interface DigiChatProps {
  clientId: string;
  projects: Array<{ id: string; name: string }>;
}

export function DigiChat({ clientId, projects }: DigiChatProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(projects.length === 1 ? projects[0].id : undefined);
  const [showEscalation, setShowEscalation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false);
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      setError(null);
      setShowEscalation(false);

      const newMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: userMessage },
      ];
      setMessages(newMessages);
      setIsStreaming(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            projectId: selectedProjectId,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          setError(
            errData.error || "Something went wrong. Please try again."
          );
          setIsStreaming(false);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }

        // Check if Digi suggested escalation
        if (assistantContent.toLowerCase().includes("support ticket")) {
          setShowEscalation(true);
        }
      } catch {
        setError(
          "I couldn't connect. Please check your internet and try again."
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, selectedProjectId]
  );

  const handleOpenTicket = useCallback(() => {
    const userMessages = messages.filter((m) => m.role === "user");
    const summary = messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Client" : "Digi"}: ${m.content}`)
      .join("\n\n");

    sessionStorage.setItem(
      "digi_escalation",
      JSON.stringify({
        title: `Question from Digi chat: ${userMessages[0]?.content.slice(0, 80) || "Support request"}`,
        description: `Escalated from Digi AI assistant.\n\nConversation summary:\n${summary}`,
        projectId: selectedProjectId || "",
      })
    );

    router.push("/dashboard/client/tickets");
    setIsOpen(false);
  }, [messages, selectedProjectId, router]);

  // Suppress clientId usage warning — used for future expansion
  void clientId;

  return (
    <>
      <ChatBubble isOpen={isOpen} onClick={() => setIsOpen((prev) => !prev)} />

      <ChatPanel
        isOpen={isOpen}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
      >
        <ChatMessages messages={messages} isStreaming={isStreaming} />

        {error && (
          <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
            {error}
          </div>
        )}

        {showEscalation && !isStreaming && (
          <EscalationBanner
            onOpenTicket={handleOpenTicket}
            onDismiss={() => setShowEscalation(false)}
          />
        )}

        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </ChatPanel>
    </>
  );
}
