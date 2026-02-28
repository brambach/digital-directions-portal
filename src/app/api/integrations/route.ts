import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationMonitors } from "@/lib/db/schema";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { isNull, desc, eq, and } from "drizzle-orm";

// GET /api/integrations - List all integration monitors
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get projectId or clientId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");

    // Authorization check
    if (user.role === "client") {
      // Clients can only see their own integrations
      if (!user.clientId) {
        return NextResponse.json(
          { error: "Client user must be associated with a client" },
          { status: 403 }
        );
      }

      // If clientId is provided, it must match the user's clientId
      if (clientId && clientId !== user.clientId) {
        return NextResponse.json(
          { error: "Forbidden: Cannot access other client's integrations" },
          { status: 403 }
        );
      }

      // Build where clause for client users
      const whereConditions = [
        eq(integrationMonitors.clientId, user.clientId),
        isNull(integrationMonitors.deletedAt),
      ];

      if (projectId) {
        whereConditions.push(eq(integrationMonitors.projectId, projectId));
      }

      const monitors = await db
        .select()
        .from(integrationMonitors)
        .where(and(...whereConditions))
        .orderBy(desc(integrationMonitors.createdAt));

      return NextResponse.json(monitors);
    }

    // Admin users can see all or filter by projectId/clientId
    const whereConditions = [isNull(integrationMonitors.deletedAt)];

    if (projectId) {
      whereConditions.push(eq(integrationMonitors.projectId, projectId));
    }
    if (clientId) {
      whereConditions.push(eq(integrationMonitors.clientId, clientId));
    }

    const monitors = await db
      .select()
      .from(integrationMonitors)
      .where(and(...whereConditions))
      .orderBy(desc(integrationMonitors.createdAt));

    return NextResponse.json(monitors);
  } catch (error: any) {
    console.error("Error fetching integration monitors:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/integrations - Create new integration monitor (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      projectId,
      clientId,
      serviceType,
      serviceName,
      workatoCredentials,
      isEnabled,
      checkIntervalMinutes,
      alertEnabled,
      alertChannels,
      alertThresholdMinutes,
    } = body;

    if (!projectId || !clientId || !serviceType || !serviceName) {
      return NextResponse.json(
        { error: "projectId, clientId, serviceType, and serviceName are required" },
        { status: 400 }
      );
    }

    // Validate serviceType
    const validServiceTypes = ["hibob", "workato", "keypay", "netsuite", "deputy", "myob"];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { error: "Invalid serviceType" },
        { status: 400 }
      );
    }

    // Create integration monitor
    const result = await db
      .insert(integrationMonitors)
      .values({
        projectId,
        clientId,
        serviceType,
        serviceName,
        workatoCredentials: workatoCredentials || null,
        isEnabled: isEnabled !== false, // Default to true
        checkIntervalMinutes: checkIntervalMinutes || 5,
        currentStatus: "unknown",
        alertEnabled: alertEnabled !== false, // Default to true
        alertChannels: alertChannels || JSON.stringify(["email", "in_app"]),
        alertThresholdMinutes: alertThresholdMinutes || 15,
        checkPlatformStatus: true, // Always true now
      })
      .returning();

    const newMonitor = (result as any)[0];

    // Trigger immediate health check in background (don't await)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET;

    fetch(`${baseUrl}/api/cron/check-integrations`, {
      method: "GET",
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    }).catch((error) => {
      console.error("Failed to trigger immediate health check:", error);
      // Don't fail the request if health check trigger fails
    });

    return NextResponse.json(newMonitor, { status: 201 });
  } catch (error: any) {
    console.error("Error creating integration monitor:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
