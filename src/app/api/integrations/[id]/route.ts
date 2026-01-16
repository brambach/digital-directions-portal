import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationMonitors } from "@/lib/db/schema";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

// GET /api/integrations/[id] - Get single integration monitor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const monitor = await db
      .select()
      .from(integrationMonitors)
      .where(
        and(eq(integrationMonitors.id, id), isNull(integrationMonitors.deletedAt))
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!monitor) {
      return NextResponse.json(
        { error: "Integration monitor not found" },
        { status: 404 }
      );
    }

    // Authorization: clients can only access integrations for their projects
    if (user.role === "client" && monitor.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(monitor);
  } catch (error: any) {
    console.error("Error fetching integration monitor:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/integrations/[id] - Update integration monitor (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const {
      serviceName,
      workatoCredentials,
      isEnabled,
      checkIntervalMinutes,
      alertEnabled,
      alertChannels,
      alertThresholdMinutes,
    } = body;

    // Validate service name if provided
    if (serviceName !== undefined && (typeof serviceName !== "string" || serviceName.length === 0 || serviceName.length > 255)) {
      return NextResponse.json(
        { error: "Service name must be a non-empty string with max 255 characters" },
        { status: 400 }
      );
    }

    // Validate check interval if provided
    if (
      checkIntervalMinutes !== undefined &&
      (typeof checkIntervalMinutes !== "number" ||
        checkIntervalMinutes < 1 ||
        checkIntervalMinutes > 1440 ||
        !Number.isInteger(checkIntervalMinutes))
    ) {
      return NextResponse.json(
        { error: "Check interval must be an integer between 1 and 1440 minutes" },
        { status: 400 }
      );
    }

    // Check if monitor exists
    const existing = await db
      .select()
      .from(integrationMonitors)
      .where(
        and(eq(integrationMonitors.id, id), isNull(integrationMonitors.deletedAt))
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!existing) {
      return NextResponse.json(
        { error: "Integration monitor not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (serviceName !== undefined) updateData.serviceName = serviceName;
    if (workatoCredentials !== undefined) updateData.workatoCredentials = workatoCredentials;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (checkIntervalMinutes !== undefined) updateData.checkIntervalMinutes = checkIntervalMinutes;
    if (alertEnabled !== undefined) updateData.alertEnabled = alertEnabled;
    if (alertChannels !== undefined) updateData.alertChannels = alertChannels;
    if (alertThresholdMinutes !== undefined) updateData.alertThresholdMinutes = alertThresholdMinutes;

    // Update monitor
    await db
      .update(integrationMonitors)
      .set(updateData)
      .where(eq(integrationMonitors.id, id));

    // Fetch updated monitor
    const updatedMonitor = await db
      .select()
      .from(integrationMonitors)
      .where(eq(integrationMonitors.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    return NextResponse.json(updatedMonitor);
  } catch (error: any) {
    console.error("Error updating integration monitor:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/[id] - Soft delete integration monitor (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if monitor exists
    const existing = await db
      .select()
      .from(integrationMonitors)
      .where(
        and(eq(integrationMonitors.id, id), isNull(integrationMonitors.deletedAt))
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!existing) {
      return NextResponse.json(
        { error: "Integration monitor not found" },
        { status: 404 }
      );
    }

    // Soft delete monitor
    await db
      .update(integrationMonitors)
      .set({ deletedAt: new Date() })
      .where(eq(integrationMonitors.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting integration monitor:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
