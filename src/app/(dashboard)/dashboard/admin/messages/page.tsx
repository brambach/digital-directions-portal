import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, users } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { MessagesInterface } from "@/components/messages-interface";
import { auth } from "@clerk/nextjs/server";

export default async function AdminMessagesPage() {
    await requireAdmin();
    const { userId } = await auth();

    if (!userId) return null;

    // Get current user ID (UUID)
    const currentUser = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1)
        .then(rows => rows[0]);

    if (!currentUser) return <div>User not found</div>;

    // Fetch all active projects
    const allProjects = await db
        .select({
            id: projects.id,
            name: projects.name,
            clientName: clients.companyName,
            updatedAt: projects.updatedAt,
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(isNull(projects.deletedAt))
        .orderBy(desc(projects.updatedAt));

    const formattedProjects = allProjects.map(p => ({
        ...p,
        clientName: p.clientName || "Unknown Client"
    }));

    return (
        <MessagesInterface
            projects={formattedProjects}
            currentUserId={currentUser.id}
            userRole="admin"
        />
    );
}
