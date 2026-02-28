export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  clientName: string;
  contactName: string;
  projects: Array<{
    id: string;
    name: string;
    currentStage: string;
    payrollSystem: string | null;
  }>;
  selectedProject?: {
    id: string;
    name: string;
    currentStage: string;
    payrollSystem: string | null;
  };
  unresolvedFlags: Array<{
    projectName: string;
    type: string;
    message: string;
  }>;
  knowledgeBase: Array<{
    title: string;
    category: string | null;
    content: string;
  }>;
}
