import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bobConfigChecklist, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendBobConfigEmail } from "@/lib/email";
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

    const [checklist] = await db
      .select()
      .from(bobConfigChecklist)
      .where(eq(bobConfigChecklist.projectId, projectId))
      .limit(1);

    if (!checklist) {
      return NextResponse.json({ error: "Bob Config checklist not found" }, { status: 404 });
    }

    if (checklist.status !== "in_review") {
      return NextResponse.json(
        { error: "Checklist is not in a withdrawable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(bobConfigChecklist)
      .set({
        status: "active",
        submittedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(bobConfigChecklist.id, checklist.id))
      .returning();

    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const admin of adminUsers) {
      await db.insert(userNotifications).values({
        userId: admin.id,
        type: "bob_config",
        title: "HiBob config submission withdrawn",
        message: `The HiBob configuration checklist for "${project.name}" has been withdrawn by the client. They may resubmit after making changes.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/bob-config`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(admin.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
        if (email) {
          await sendBobConfigEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "withdrawn",
          });
        }
      } catch (emailErr) {
        console.error("Error sending bob config withdrawal email:", emailErr);
      }
    }

    return NextResponse.json({
      checklist: { ...updated, items: JSON.parse(updated.items) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
