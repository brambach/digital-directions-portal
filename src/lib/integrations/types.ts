/**
 * Shared types for integration health monitoring
 */

/**
 * Base health check result from status pages
 */
export interface BaseHealthCheckResult {
  status: "healthy" | "degraded" | "down" | "unknown";
  responseTimeMs: number | null;
  errorMessage: string | null;
}

/**
 * Workato-specific health check (basic recipe list only)
 */
export interface WorkatoHealthCheckResult extends BaseHealthCheckResult {
  recipeCount?: number;
  runningCount?: number;
  stoppedCount?: number;
}

export type HealthCheckResult = BaseHealthCheckResult | WorkatoHealthCheckResult;

export function isWorkatoHealthResult(
  result: HealthCheckResult
): result is WorkatoHealthCheckResult {
  return "recipeCount" in result;
}
