import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientFlags } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// PATCH /api/projects/[id]/flags/[flagId] — resolve a flag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; flagId: string }> }
) {
  try {
    const user = await requireAuth();
    const { flagId } = await params;

    // Get the flag
    const [flag] = await db
      .select()
      .from(clientFlags)
      .where(
        and(eq(clientFlags.id, flagId), isNull(clientFlags.resolvedAt))
      )
      .limit(1);

    if (!flag) {
      return NextResponse.json(
        { error: "Flag not found or already resolved" },
        { status: 404 }
      );
    }

    // Admins can resolve any flag; clients can only resolve client_input_needed flags on their projects
    if (user.role === "client" && flag.type !== "client_input_needed") {
      return NextResponse.json(
        { error: "Clients can only resolve 'input needed' flags." },
        { status: 403 }
      );
    }

    const [resolved] = await db
      .update(clientFlags)
      .set({
        resolvedAt: new Date(),
        resolvedBy: user.id,
      })
      .where(eq(clientFlags.id, flagId))
      .returning();

    return NextResponse.json({ flag: resolved });
  } catch (error: any) {
    console.error("Error resolving flag:", error);
    return NextResponse.json(
      { error: "Failed to resolve flag" },
      { status: 500 }
    );
  }
}
