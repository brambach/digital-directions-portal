import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

// POST /api/notifications/read-all - Mark all notifications as read
export async function POST() {
  try {
    const user = await requireAuth();

    await db
      .update(userNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(userNotifications.userId, user.id),
          eq(userNotifications.isRead, false)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error marking all notifications as read:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
