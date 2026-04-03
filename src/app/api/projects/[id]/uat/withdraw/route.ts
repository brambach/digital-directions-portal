import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uatResults, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendUatEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

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

    const [result] = await db
      .select()
      .from(uatResults)
      .where(eq(uatResults.projectId, projectId))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: "No UAT results found" },
        { status: 404 }
      );
    }

    if (result.status !== "in_review") {
      return NextResponse.json(
        { error: "UAT results are not in a withdrawable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(uatResults)
      .set({
        status: "active",
        submittedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(uatResults.id, result.id))
      .returning();

    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    for (const adminUser of adminUsers) {
      await db.insert(userNotifications).values({
        userId: adminUser.id,
        type: "uat_submitted",
        title: "UAT results withdrawn",
        message: `The UAT results for "${project.name}" have been withdrawn by the client. They may resubmit after making changes.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/uat`,
      });

      try {
        const clerkAdmin = await clerk.users.getUser(adminUser.clerkId);
        const email = clerkAdmin.emailAddresses[0]?.emailAddress;
        const name = `${clerkAdmin.firstName || ""}`.trim() || "Team";
        if (email) {
          await sendUatEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "withdrawn",
          });
        }
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
