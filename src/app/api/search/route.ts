import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, projects, tickets } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ilike, or, isNull, and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ clients: [], projects: [], tickets: [] });
    }

    const term = `%${q}%`;

    if (user.role === "admin") {
      const [matchedClients, matchedProjects, matchedTickets] = await Promise.all([
        db
          .select({ id: clients.id, companyName: clients.companyName, contactName: clients.contactName, status: clients.status })
          .from(clients)
          .where(and(isNull(clients.deletedAt), or(ilike(clients.companyName, term), ilike(clients.contactName, term))))
          .limit(5),
        db
          .select({ id: projects.id, name: projects.name, currentStage: projects.currentStage, clientId: projects.clientId })
          .from(projects)
          .where(and(isNull(projects.deletedAt), or(ilike(projects.name, term), ilike(projects.description, term))))
          .limit(5),
        db
          .select({ id: tickets.id, title: tickets.title, status: tickets.status, priority: tickets.priority, clientId: tickets.clientId })
          .from(tickets)
          .where(and(isNull(tickets.deletedAt), or(ilike(tickets.title, term), ilike(tickets.description, term))))
          .limit(5),
      ]);

      return NextResponse.json({
        clients: matchedClients,
        projects: matchedProjects,
        tickets: matchedTickets,
      });
    } else {
      // Client user — scope to their own client
      if (!user.clientId) {
        return NextResponse.json({ clients: [], projects: [], tickets: [] });
      }

      const [matchedProjects, matchedTickets] = await Promise.all([
        db
          .select({ id: projects.id, name: projects.name, currentStage: projects.currentStage, clientId: projects.clientId })
          .from(projects)
          .where(and(
            isNull(projects.deletedAt),
            eq(projects.clientId, user.clientId),
            or(ilike(projects.name, term), ilike(projects.description, term))
          ))
          .limit(5),
        db
          .select({ id: tickets.id, title: tickets.title, status: tickets.status, priority: tickets.priority, clientId: tickets.clientId })
          .from(tickets)
          .where(and(
            isNull(tickets.deletedAt),
            eq(tickets.clientId, user.clientId),
            or(ilike(tickets.title, term), ilike(tickets.description, term))
          ))
          .limit(5),
      ]);

      return NextResponse.json({
        clients: [],
        projects: matchedProjects,
        tickets: matchedTickets,
      });
    }
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
