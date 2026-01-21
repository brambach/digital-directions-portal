import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, humans, clients, users } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { MessagesInterface } from "@/components/messages-interface";

export default async function ClientMessagesPage() {
    const user = await requireAuth();

    if (!user) return <div>User not found</div>;

    // Fetch client projects
    // If user is client, they should have a clientId.
    // However, if they are admin viewing as client? No, this is client dashboard.
    // If clientId is missing, show empty state.

    let clientProjects: any[] = [];

    if (user.clientId) {
        clientProjects = await db
            .select({
                id: projects.id,
                name: projects.name,
                clientName: clients.companyName, // This will just be their own company
                updatedAt: projects.updatedAt,
            })
            .from(projects)
            .leftJoin(clients, eq(projects.clientId, clients.id))
            .where(
                eq(projects.clientId, user.clientId),
                isNull(projects.deletedAt)
            )
            .orderBy(desc(projects.updatedAt));
    }

    const formattedProjects = clientProjects.map(p => ({
        ...p,
        clientName: p.clientName || "My Project"
    }));

    return (
        <MessagesInterface
            projects={formattedProjects}
            currentUserId={user.id}
            userRole="client"
        />
    );
}
