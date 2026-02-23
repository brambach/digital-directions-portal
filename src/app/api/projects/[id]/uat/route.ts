import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, uatTemplates, uatResults, users, userNotifications } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendUatEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// GET /api/projects/[id]/uat — fetch uatResults + template for project
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "client" && project.clientId !== user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [result] = await db
    .select()
    .from(uatResults)
    .where(eq(uatResults.projectId, projectId))
    .limit(1);

  if (!result) {
    return NextResponse.json({ uatResult: null, template: null });
  }

  const [template] = await db
    .select()
    .from(uatTemplates)
    .where(eq(uatTemplates.id, result.templateId))
    .limit(1);

  return NextResponse.json({ uatResult: result, template: template ?? null });
}

// POST /api/projects/[id]/uat — admin publishes UAT from template (creates uatResults with status active)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if UAT results already exist
  const [existing] = await db
    .select()
    .from(uatResults)
    .where(eq(uatResults.projectId, projectId))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "UAT already published for this project" }, { status: 409 });
  }

  // Read templateId from request body
  const body = await req.json().catch(() => ({}));
  const { templateId } = body as { templateId?: string };

  let template;

  if (templateId) {
    // Use the explicitly selected template
    [template] = await db
      .select()
      .from(uatTemplates)
      .where(
        and(
          eq(uatTemplates.id, templateId),
          eq(uatTemplates.isActive, true),
          isNull(uatTemplates.deletedAt)
        )
      )
      .limit(1);
  } else {
    // Fallback: auto-match by payroll system
    const payrollSystem = project.payrollSystem || "generic";
    [template] = await db
      .select()
      .from(uatTemplates)
      .where(
        and(
          eq(uatTemplates.payrollSystem, payrollSystem),
          eq(uatTemplates.isActive, true),
          isNull(uatTemplates.deletedAt)
        )
      )
      .limit(1);

    if (!template && payrollSystem !== "generic") {
      [template] = await db
        .select()
        .from(uatTemplates)
        .where(
          and(
            eq(uatTemplates.payrollSystem, "generic"),
            eq(uatTemplates.isActive, true),
            isNull(uatTemplates.deletedAt)
          )
        )
        .limit(1);
    }
  }

  if (!template) {
    return NextResponse.json({ error: "No UAT template found" }, { status: 404 });
  }

  // Create UAT results with active status
  const [result] = await db
    .insert(uatResults)
    .values({
      projectId,
      templateId: template.id,
      results: "{}",
      status: "active",
    })
    .returning();

  // Notify client users
  await notifyClientsOfUatPublished(projectId, project.clientId, project.name);

  return NextResponse.json(result, { status: 201 });
}

async function notifyClientsOfUatPublished(
  projectId: string,
  clientId: string,
  projectName: string
) {
  try {
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "uat_published",
        title: "UAT Testing Ready",
        message: `Your UAT test scenarios for "${projectName}" are ready to complete.`,
        linkUrl: `/dashboard/client/projects/${projectId}/uat`,
      });

      try {
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""}`.trim() || "there";
        if (email) {
          await sendUatEmail({
            to: email,
            recipientName: name,
            projectName,
            projectId,
            event: "published",
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify clients of UAT publish:", err);
  }
}
