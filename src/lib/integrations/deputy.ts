/**
 * Deputy Health Check
 * Uses status page only - no credential checking
 */

import { BaseHealthCheckResult } from "./types";
import { checkDeputyStatus } from "./status-pages";

export async function checkDeputyHealth(): Promise<BaseHealthCheckResult> {
  try {
    const statusResult = await checkDeputyStatus();

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
