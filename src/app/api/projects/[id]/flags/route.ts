import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientFlags, projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

// GET /api/projects/[id]/flags — list unresolved flags
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify project exists and user has access
    const [project] = await db
      .select({ id: projects.id, clientId: projects.clientId })
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Client users can only see their project's flags
    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const flags = await db
      .select()
      .from(clientFlags)
      .where(
        and(
          eq(clientFlags.projectId, id),
          isNull(clientFlags.resolvedAt)
        )
      )
      .orderBy(clientFlags.createdAt);

    return NextResponse.json({ flags });
  } catch (error: any) {
    console.error("Error fetching flags:", error);
    return NextResponse.json({ error: "Failed to fetch flags" }, { status: 500 });
  }
}

// POST /api/projects/[id]/flags — create a flag
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { type, message } = body as { type: string; message: string };

    if (!type || !message?.trim()) {
      return NextResponse.json(
        { error: "Type and message are required." },
        { status: 400 }
      );
    }

    const validTypes = ["client_blocker", "client_input_needed"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid flag type." },
        { status: 400 }
      );
    }

    // Only admins can raise client_input_needed flags
    if (type === "client_input_needed" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can raise 'input needed' flags." },
        { status: 403 }
      );
    }

    // Only clients can raise client_blocker flags
    if (type === "client_blocker" && user.role !== "client") {
      return NextResponse.json(
        { error: "Only clients can raise blocker flags." },
        { status: 403 }
      );
    }

    // Verify project exists
    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
      })
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Client users can only flag their own projects
    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [flag] = await db
      .insert(clientFlags)
      .values({
        projectId: id,
        raisedBy: user.id,
        type,
        message: message.trim(),
      })
      .returning();

    if (type === "client_blocker") {
      notifyEvent({
        event: "client_flag_raised",
        projectId: id,
        projectName: project.name,
        clientId: project.clientId,
        flagMessage: message.trim(),
      });
    } else {
      notifyEvent({
        event: "admin_flag_raised",
        projectId: id,
        projectName: project.name,
        clientId: project.clientId,
        flagMessage: message.trim(),
      });
    }

    return NextResponse.json({ flag }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating flag:", error);
    return NextResponse.json({ error: "Failed to create flag" }, { status: 500 });
  }
}
