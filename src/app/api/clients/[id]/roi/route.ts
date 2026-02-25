import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roiConfigs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;

    const [config] = await db
      .select()
      .from(roiConfigs)
      .where(eq(roiConfigs.clientId, clientId))
      .limit(1);

    if (!config) {
      return NextResponse.json(null);
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching ROI config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
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

    const { id: clientId } = await params;
    const body = await req.json();
    const {
      hoursSavedPerPayRun,
      employeeCount,
      payRunsPerYear,
      hourlyRate,
      costOfManualErrors,
    } = body;

    // Upsert
    const [existing] = await db
      .select()
      .from(roiConfigs)
      .where(eq(roiConfigs.clientId, clientId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(roiConfigs)
        .set({
          hoursSavedPerPayRun: hoursSavedPerPayRun ?? existing.hoursSavedPerPayRun,
          employeeCount: employeeCount ?? existing.employeeCount,
          payRunsPerYear: payRunsPerYear ?? existing.payRunsPerYear,
          hourlyRate: hourlyRate ?? existing.hourlyRate,
          costOfManualErrors: costOfManualErrors ?? existing.costOfManualErrors,
          updatedAt: new Date(),
        })
        .where(eq(roiConfigs.id, existing.id))
        .returning();

      return NextResponse.json(updated);
    } else {
      const [created] = await db
        .insert(roiConfigs)
        .values({
          clientId,
          hoursSavedPerPayRun: hoursSavedPerPayRun ?? 0,
          employeeCount: employeeCount ?? 0,
          payRunsPerYear: payRunsPerYear ?? 26,
          hourlyRate: hourlyRate ?? 50,
          costOfManualErrors: costOfManualErrors ?? 0,
        })
        .returning();

      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    console.error("Error updating ROI config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
