import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationMonitors, integrationMetrics } from "@/lib/db/schema";
import { isNull, and, eq } from "drizzle-orm";
import { checkHiBobHealth } from "@/lib/integrations/hibob";
import { checkKeyPayHealth } from "@/lib/integrations/keypay";
import { checkWorkatoHealth } from "@/lib/integrations/workato";
import { checkADPHealth } from "@/lib/integrations/adp";
import { checkNetSuiteHealth } from "@/lib/integrations/netsuite";
import { checkAndSendAlerts } from "@/lib/integrations/alert-manager";
import { isWorkatoHealthResult } from "@/lib/integrations/types";
import { decryptCredentials } from "@/lib/crypto";

/** Result details for a single integration check */
interface CheckDetail {
  serviceName: string;
  status?: string;
  responseTimeMs?: number | null;
  error?: string;
}

/**
 * Cron job to check health of all enabled integrations
 *
 * This endpoint is called every 5 minutes by Vercel Cron (see vercel.json).
 * Secured with CRON_SECRET - required in production.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, CRON_SECRET is required
    if (!cronSecret && process.env.NODE_ENV === "production") {
      console.error("[Cron] CRON_SECRET not configured in production");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all enabled monitors that haven't been deleted
    const monitors = await db
      .select()
      .from(integrationMonitors)
      .where(
        and(
          eq(integrationMonitors.isEnabled, true),
          isNull(integrationMonitors.deletedAt)
        )
      );

    const results = {
      checked: 0,
      skipped: 0,
      errors: 0,
      details: [] as CheckDetail[],
    };

    // Check each monitor
    for (const monitor of monitors) {
      try {
        // Determine if this monitor is due for a check
        const now = new Date();
        const intervalMs = monitor.checkIntervalMinutes * 60 * 1000;
        const lastChecked = monitor.lastCheckedAt
          ? new Date(monitor.lastCheckedAt)
          : null;

        // Skip if checked recently (within the interval)
        if (lastChecked && now.getTime() - lastChecked.getTime() < intervalMs) {
          results.skipped++;
          continue;
        }

        // Perform health check based on service type
        let healthResult;
        switch (monitor.serviceType) {
          case "hibob":
            healthResult = await checkHiBobHealth();
            break;

          case "keypay":
            healthResult = await checkKeyPayHealth();
            break;

          case "workato": {
            // Decrypt/parse Workato credentials if present
            const credentials = monitor.workatoCredentials
              ? decryptCredentials(monitor.workatoCredentials)
              : null;
            healthResult = await checkWorkatoHealth(credentials);
            break;
          }

          case "adp":
            healthResult = await checkADPHealth();
            break;

          case "netsuite":
            healthResult = await checkNetSuiteHealth();
            break;

          default:
            results.skipped++;
            continue;
        }

        // Store the previous status before updating
        const previousStatus = monitor.currentStatus;

        // Update monitor with new status
        await db
          .update(integrationMonitors)
          .set({
            currentStatus: healthResult.status,
            lastCheckedAt: now,
            lastErrorMessage: healthResult.errorMessage || null,
            platformStatus: healthResult.status, // Same as current status now
            platformLastChecked: now,
          })
          .where(eq(integrationMonitors.id, monitor.id));

        // Insert metric record
        const metricData = {
          monitorId: monitor.id,
          status: healthResult.status,
          responseTimeMs: healthResult.responseTimeMs ?? null,
          errorMessage: healthResult.errorMessage ?? null,
          checkedAt: now,
          workatoRecipeCount: null as number | null,
          workatoRunningCount: null as number | null,
          workatoStoppedCount: null as number | null,
        };

        // Add Workato-specific metrics if applicable
        if (isWorkatoHealthResult(healthResult)) {
          metricData.workatoRecipeCount = healthResult.recipeCount ?? null;
          metricData.workatoRunningCount = healthResult.runningCount ?? null;
          metricData.workatoStoppedCount = healthResult.stoppedCount ?? null;
        }

        await db.insert(integrationMetrics).values(metricData);

        // Check if alerts should be sent (pass monitor with previous status)
        await checkAndSendAlerts(
          { ...monitor, currentStatus: previousStatus ?? "unknown" },
          healthResult.status
        );

        results.checked++;
        results.details.push({
          serviceName: monitor.serviceName,
          status: healthResult.status,
          responseTimeMs: healthResult.responseTimeMs,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Cron] Error checking ${monitor.serviceName}:`, errorMessage);
        results.errors++;
        results.details.push({
          serviceName: monitor.serviceName,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Cron] Fatal error:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
