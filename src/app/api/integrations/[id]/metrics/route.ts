import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationMonitors, integrationMetrics } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull, desc, gte } from "drizzle-orm";

// GET /api/integrations/[id]/metrics - Get historical metrics for charts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Get timeRange from query params (default to 24h)
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "24h";

    // Calculate date based on time range
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "1h":
        startDate.setHours(now.getHours() - 1);
        break;
      case "6h":
        startDate.setHours(now.getHours() - 6);
        break;
      case "24h":
        startDate.setHours(now.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setHours(now.getHours() - 24);
    }

    // Fetch monitor
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

    // Check authorization - clients can only see their own integrations
    if (user.role === "client" && monitor.clientId !== user.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch metrics within time range
    const metrics = await db
      .select()
      .from(integrationMetrics)
      .where(
        and(
          eq(integrationMetrics.monitorId, id),
          gte(integrationMetrics.checkedAt, startDate)
        )
      )
      .orderBy(desc(integrationMetrics.checkedAt));

    // Calculate uptime percentage
    const totalChecks = metrics.length;
    const healthyChecks = metrics.filter((m) => m.status === "healthy").length;
    const uptimePercentage =
      totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0;

    // Calculate average response time
    const avgResponseTime =
      metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.responseTimeMs || 0), 0) /
          metrics.length
        : 0;

    // Get the latest metric with full details (including Workato recipe counts)
    const latestMetric = metrics.length > 0 ? metrics[0] : null;

    return NextResponse.json({
      timeRange,
      totalChecks,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      metrics,
      latestMetric,
    });
  } catch (error: any) {
    console.error("Error fetching integration metrics:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
