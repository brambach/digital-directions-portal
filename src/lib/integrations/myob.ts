/**
 * MYOB Health Check
 * Uses status page only - no credential checking
 */

import { BaseHealthCheckResult } from "./types";
import { checkMYOBStatus } from "./status-pages";

export async function checkMYOBHealth(): Promise<BaseHealthCheckResult> {
  // status.myob.com uses StatusHub with no public API — cannot be auto-checked
  return {
    status: "unknown",
    responseTimeMs: null,
    errorMessage: "Manual check required — status.myob.com",
  };
}
