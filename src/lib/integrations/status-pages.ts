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
 * Check KeyPay platform status
 * https://status.keypay.com.au
 */
export async function checkKeyPayStatus(): Promise<StatusPageResult> {
  const statusPageUrl = "https://status.keypay.com.au/api/v2/summary.json";
  return parseAtlassianStatuspage(statusPageUrl);
}

/**
 * Check Workato platform status
 * https://status.workato.com
 */
export async function checkWorkatoStatus(): Promise<StatusPageResult> {
  const statusPageUrl = "https://status.workato.com/api/v2/summary.json";
  return parseAtlassianStatuspage(statusPageUrl);
}

/**
 * Check ADP platform status
 * Note: ADP may not have a public status page in Statuspage format
 * This is a placeholder implementation
 */
export async function checkADPStatus(): Promise<StatusPageResult> {
  // ADP's status page URL (if they have one)
  // This may need to be updated based on actual ADP status page format
  try {
    const statusPageUrl = "https://status.adp.com/api/v2/summary.json";
    return parseAtlassianStatuspage(statusPageUrl);
  } catch (error) {
    // If ADP doesn't have a public status page, return operational by default
    console.warn("ADP status page not available, assuming operational");
    return {
      status: "operational",
      description: "Status page not available",
      incidents: [],
      lastChecked: new Date(),
    };
  }
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
    case "adp":
      return checkADPStatus;
    case "netsuite":
      return checkNetSuiteStatus;
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
