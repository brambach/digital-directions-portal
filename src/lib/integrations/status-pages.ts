/**
 * Platform Status Page Parsers
 *
 * Fetches and parses status page information from integration platforms.
 * Most platforms use Atlassian Statuspage format.
 */

export interface StatusPageIncident {
  name: string;
  status: string;
  impact: string;
  created_at: string;
  updated_at: string;
  shortlink?: string;
}

export interface StatusPageResult {
  status: "operational" | "degraded" | "major_outage" | "maintenance";
  description: string;
  incidents: StatusPageIncident[];
  lastChecked: Date;
}

/**
 * Generic parser for Atlassian Statuspage format
 */
async function parseAtlassianStatuspage(url: string): Promise<StatusPageResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Digital-Directions-Portal/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Status page returned ${response.status}`);
    }

    const data = await response.json();

    // Parse overall status
    let status: StatusPageResult["status"] = "operational";
    let description = "All systems operational";

    if (data.status) {
      const indicator = data.status.indicator;
      switch (indicator) {
        case "none":
          status = "operational";
          description = data.status.description || "All systems operational";
          break;
        case "minor":
          status = "degraded";
          description = data.status.description || "Minor service disruption";
          break;
        case "major":
          status = "major_outage";
          description = data.status.description || "Major service outage";
          break;
        case "critical":
          status = "major_outage";
          description = data.status.description || "Critical service outage";
          break;
        case "maintenance":
          status = "maintenance";
          description = data.status.description || "Scheduled maintenance";
          break;
        default:
          status = "operational";
      }
    }

    // Parse incidents
    const incidents: StatusPageIncident[] = [];
    if (data.incidents && Array.isArray(data.incidents)) {
      for (const incident of data.incidents) {
        // Only include unresolved incidents
        if (incident.status !== "resolved" && incident.status !== "postmortem") {
          incidents.push({
            name: incident.name,
            status: incident.status,
            impact: incident.impact,
            created_at: incident.created_at,
            updated_at: incident.updated_at,
            shortlink: incident.shortlink,
          });
        }
      }
    }

    return {
      status,
      description,
      incidents,
      lastChecked: new Date(),
    };
  } catch (error: any) {
    console.error(`Error fetching status page ${url}:`, error);
    // Return degraded status if we can't fetch the status page
    return {
      status: "degraded",
      description: "Unable to fetch status page",
      incidents: [],
      lastChecked: new Date(),
    };
  }
}

/**
 * Check HiBob platform status
 * https://status.hibob.io
 */
export async function checkHiBobStatus(): Promise<StatusPageResult> {
  const statusPageUrl = "https://status.hibob.io/api/v2/summary.json";
  return parseAtlassianStatuspage(statusPageUrl);
}

/**
 * Check KeyPay (Employment Hero) platform status
 * KeyPay rebranded to Employment Hero — old status.keypay.com.au is dead
 * https://status.employmenthero.com
 */
export async function checkKeyPayStatus(): Promise<StatusPageResult> {
  const statusPageUrl =
    "https://status.employmenthero.com/api/v2/summary.json";
  return parseAtlassianStatuspage(statusPageUrl);
}

/**
 * Check Workato platform status (AU region)
 * https://status.au.workato.com
 */
export async function checkWorkatoStatus(): Promise<StatusPageResult> {
  const statusPageUrl = "https://status.au.workato.com/api/v2/summary.json";
  return parseAtlassianStatuspage(statusPageUrl);
}

/**
 * Check NetSuite platform status
 * https://status.netsuite.com
 */
export async function checkNetSuiteStatus(): Promise<StatusPageResult> {
  const statusPageUrl = "https://status.netsuite.com/api/v2/summary.json";
  return parseAtlassianStatuspage(statusPageUrl);
}

/**
 * Check Deputy platform status
 * https://status.deputy.com
 */
export async function checkDeputyStatus(): Promise<StatusPageResult> {
  const statusPageUrl = "https://status.deputy.com/api/v2/summary.json";
  return parseAtlassianStatuspage(statusPageUrl);
}

/**
 * Check MYOB platform status
 * https://status.myob.com uses StatusHub (not Atlassian Statuspage).
 * StatusHub requires an API key for programmatic access, so we can't
 * auto-check. Returns operational by default — check manually at
 * https://status.myob.com if issues are suspected.
 */
export async function checkMYOBStatus(): Promise<StatusPageResult> {
  return {
    status: "operational",
    description: "Status page requires manual check (StatusHub)",
    incidents: [],
    lastChecked: new Date(),
  };
}

/**
 * Get status checker function by service type
 */
export function getStatusChecker(
  serviceType: string
): () => Promise<StatusPageResult> {
  switch (serviceType.toLowerCase()) {
    case "hibob":
      return checkHiBobStatus;
    case "keypay":
      return checkKeyPayStatus;
    case "workato":
      return checkWorkatoStatus;
    case "netsuite":
      return checkNetSuiteStatus;
    case "deputy":
      return checkDeputyStatus;
    case "myob":
      return checkMYOBStatus;
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

/**
 * Map platform status to a color for UI display
 */
export function getStatusColor(
  status: StatusPageResult["status"]
): string {
  switch (status) {
    case "operational":
      return "green";
    case "degraded":
      return "yellow";
    case "major_outage":
      return "red";
    case "maintenance":
      return "blue";
    default:
      return "gray";
  }
}

/**
 * Map platform status to a display label
 */
export function getStatusLabel(
  status: StatusPageResult["status"]
): string {
  switch (status) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded Performance";
    case "major_outage":
      return "Major Outage";
    case "maintenance":
      return "Maintenance";
    default:
      return "Unknown";
  }
}
