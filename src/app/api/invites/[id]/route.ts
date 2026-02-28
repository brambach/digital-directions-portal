import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { invites, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE - Cancel (hard-delete) a pending invite (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Only allow cancelling pending invites
    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.id, id), eq(invites.status, "pending")))
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or already accepted" },
        { status: 404 }
      );
    }

    await db.delete(invites).where(eq(invites.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
