import { db } from "@/lib/db";
import { clients, projects, clientFlags, helpArticles } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { ChatContext } from "./types";

export async function loadChatContext(
  clientId: string,
  projectId?: string
): Promise<ChatContext> {
  const [clientRows, clientProjects, flags, articles] = await Promise.all([
    db
      .select({
        companyName: clients.companyName,
        contactName: clients.contactName,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1),

    db
      .select({
        id: projects.id,
        name: projects.name,
        currentStage: projects.currentStage,
        payrollSystem: projects.payrollSystem,
      })
      .from(projects)
      .where(and(eq(projects.clientId, clientId), isNull(projects.deletedAt))),

    db
      .select({
        projectName: projects.name,
        type: clientFlags.type,
        message: clientFlags.message,
      })
      .from(clientFlags)
      .innerJoin(projects, eq(clientFlags.projectId, projects.id))
      .where(
        and(eq(projects.clientId, clientId), isNull(clientFlags.resolvedAt))
      ),

    db
      .select({
        title: helpArticles.title,
        category: helpArticles.category,
        content: helpArticles.content,
      })
      .from(helpArticles)
      .where(
        and(isNotNull(helpArticles.publishedAt), isNull(helpArticles.deletedAt))
      ),
  ]);

  const client = clientRows[0];

  const context: ChatContext = {
    clientName: client?.companyName || "Unknown",
    contactName: client?.contactName || "there",
    projects: clientProjects,
    unresolvedFlags: flags,
    knowledgeBase: articles,
  };

  if (projectId) {
    const selected = clientProjects.find((p) => p.id === projectId);
    if (selected) {
      context.selectedProject = {
        id: selected.id,
        name: selected.name,
        currentStage: selected.currentStage,
        payrollSystem: selected.payrollSystem,
      };
    }
  }

  return context;
}
