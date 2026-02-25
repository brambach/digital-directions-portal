import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

type SyncComponentStatus = "not_started" | "in_progress" | "built";
type SyncComponentKey = "employeeUpsertStatus" | "leaveSyncStatus" | "paySlipStatus";

const VALID_COMPONENTS: SyncComponentKey[] = [
  "employeeUpsertStatus",
  "leaveSyncStatus",
  "paySlipStatus",
];
const VALID_STATUSES: SyncComponentStatus[] = ["not_started", "in_progress", "built"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const { component, status } = body as { component: SyncComponentKey; status: SyncComponentStatus };

    if (!VALID_COMPONENTS.includes(component)) {
      return NextResponse.json({ error: "Invalid component" }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db
      .update(projects)
      .set({ [component]: status, updatedAt: new Date() })
      .where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating build component:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
