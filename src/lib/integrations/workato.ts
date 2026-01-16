/**
 * Workato Health Check
 * Uses status page + basic recipe list (no RecipeOps)
 */

import { WorkatoHealthCheckResult } from "./types";
import { checkWorkatoStatus } from "./status-pages";

export async function checkWorkatoHealth(
  credentials: any
): Promise<WorkatoHealthCheckResult> {
  const startTime = Date.now();

  try {
    // First, check status page
    const statusResult = await checkWorkatoStatus();

    const statusMap = {
      operational: "healthy",
      degraded: "degraded",
      major_outage: "down",
      maintenance: "degraded",
    } as const;

    let baseStatus = statusMap[statusResult.status] || "unknown";

    // If credentials provided, also check basic recipe list
    let recipeCount = 0;
    let runningCount = 0;
    let stoppedCount = 0;

    if (credentials?.apiToken && credentials?.email) {
      try {
        const recipesResponse = await fetch("https://www.workato.com/api/recipes", {
          headers: {
            "X-USER-TOKEN": credentials.apiToken,
            "X-USER-EMAIL": credentials.email,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (recipesResponse.ok) {
          const recipes = await recipesResponse.json();
          recipeCount = recipes.length;
          runningCount = recipes.filter((r: any) => r.running).length;
          stoppedCount = recipes.filter((r: any) => !r.running).length;

          // If many recipes stopped, consider degraded
          if (stoppedCount > 0 && stoppedCount >= recipeCount * 0.3) {
            baseStatus = "degraded";
          }
        }
      } catch (error) {
        console.warn("Failed to fetch Workato recipes:", error);
        // Don't fail the whole check if recipe list fails
      }
    }

    const responseTime = Date.now() - startTime;

    return {
      status: baseStatus,
      responseTimeMs: responseTime,
      errorMessage: statusResult.description !== "All systems operational"
        ? statusResult.description
        : null,
      recipeCount,
      runningCount,
      stoppedCount,
    };
  } catch (error: any) {
    return {
      status: "unknown",
      responseTimeMs: Date.now() - startTime,
      errorMessage: `Failed to check Workato: ${error.message}`,
    };
  }
}
