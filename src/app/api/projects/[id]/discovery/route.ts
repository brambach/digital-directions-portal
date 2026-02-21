import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  discoveryResponses,
  discoveryTemplates,
  projects,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendDiscoveryEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// GET /api/projects/[id]/discovery — Get discovery response + template for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Client users can only see their own projects
    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get discovery response for this project
    const [response] = await db
      .select()
      .from(discoveryResponses)
      .where(eq(discoveryResponses.projectId, projectId))
      .limit(1);

    if (!response) {
      return NextResponse.json({ response: null, template: null });
    }

    // Get template
    const [template] = await db
      .select()
      .from(discoveryTemplates)
      .where(eq(discoveryTemplates.id, response.templateId))
      .limit(1);

    return NextResponse.json({
      response: {
        ...response,
        responses: JSON.parse(response.responses || "{}"),
      },
      template: template
        ? { ...template, sections: JSON.parse(template.sections || "[]") }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/discovery — Start discovery (admin assigns template)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;
    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Missing required field: templateId" },
        { status: 400 }
      );
    }

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify template exists
    const [template] = await db
      .select()
      .from(discoveryTemplates)
      .where(
        and(eq(discoveryTemplates.id, templateId), isNull(discoveryTemplates.deletedAt))
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check if response already exists
    const [existing] = await db
      .select()
      .from(discoveryResponses)
      .where(eq(discoveryResponses.projectId, projectId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Discovery already started for this project" },
        { status: 409 }
      );
    }

    // Create discovery response
    const [response] = await db
      .insert(discoveryResponses)
      .values({
        projectId,
        templateId,
        responses: "{}",
        status: "active",
      })
      .returning();

    // Notify client users
    const clientUsers = await db
      .select()
      .from(users)
      .where(
        and(eq(users.clientId, project.clientId), isNull(users.deletedAt))
      );

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "discovery",
        title: "Discovery questionnaire ready",
        message: `Your discovery questionnaire for "${project.name}" is ready to complete.`,
        linkUrl: `/dashboard/client/projects/${projectId}/discovery`,
      });

      // Send email
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "there";
        if (email) {
          await sendDiscoveryEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "ready",
          });
        }
      } catch (emailErr) {
        console.error("Error sending discovery email:", emailErr);
      }
    }

    return NextResponse.json(
      { ...response, responses: JSON.parse(response.responses) },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/projects/[id]/discovery — Save draft responses
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;
    const body = await request.json();
    const { responses } = body;

    if (!responses || typeof responses !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid responses object" },
        { status: 400 }
      );
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing response
    const [existing] = await db
      .select()
      .from(discoveryResponses)
      .where(eq(discoveryResponses.projectId, projectId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "No discovery response found for this project" },
        { status: 404 }
      );
    }

    if (existing.status !== "active") {
      return NextResponse.json(
        { error: "Discovery is not in an editable state" },
        { status: 400 }
      );
    }

    // Merge new responses with existing (so partial saves work)
    const existingResponses = JSON.parse(existing.responses || "{}");
    const mergedResponses = { ...existingResponses, ...responses };

    const [updated] = await db
      .update(discoveryResponses)
      .set({
        responses: JSON.stringify(mergedResponses),
        updatedAt: new Date(),
      })
      .where(eq(discoveryResponses.id, existing.id))
      .returning();

    return NextResponse.json({
      ...updated,
      responses: JSON.parse(updated.responses),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
