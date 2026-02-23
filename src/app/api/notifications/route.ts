import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// GET /api/notifications - Get user's notifications
export async function GET() {
  try {
    const user = await requireAuth();

    const notifications = await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, user.id))
      .orderBy(desc(userNotifications.createdAt))
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: unknown) {
    console.error("Error fetching notifications:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
