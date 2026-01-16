/**
 * ADP Health Check
 * Uses status page only - no credential checking
 * Note: ADP may not have a public status page in standard format
 */

import { BaseHealthCheckResult } from "./types";
import { checkADPStatus } from "./status-pages";

export async function checkADPHealth(): Promise<BaseHealthCheckResult> {
  try {
    const statusResult = await checkADPStatus();

    // Map status page result to health check result
    const statusMap = {
      operational: "healthy",
      degraded: "degraded",
      major_outage: "down",
      maintenance: "degraded",
    } as const;

    return {
      status: statusMap[statusResult.status] || "unknown",
      responseTimeMs: Date.now() - statusResult.lastChecked.getTime(),
      errorMessage: statusResult.description !== "All systems operational"
        ? statusResult.description
        : null,
    };
  } catch (error: any) {
    return {
      status: "unknown",
      responseTimeMs: null,
      errorMessage: `Failed to fetch status page: ${error.message}`,
    };
  }
}
