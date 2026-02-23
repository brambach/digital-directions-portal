/**
 * HiBob API integration for fetching mapping values
 * Base URL: https://api.hibob.com/v1/
 * Auth: Basic Auth (serviceUserId:serviceUserToken)
 */

import type { HiBobCredentials } from "@/lib/crypto";
import type { MappingCategory } from "@/lib/mapping-defaults";
import { DEFAULT_HIBOB_VALUES } from "@/lib/mapping-defaults";

const HIBOB_BASE_URL = "https://api.hibob.com/v1";

interface PullResult {
  values: Record<MappingCategory, string[]>;
  categoriesPopulated: MappingCategory[];
  warnings: string[];
}

function makeAuthHeader(credentials: HiBobCredentials): string {
  const encoded = Buffer.from(
    `${credentials.serviceUserId}:${credentials.serviceUserToken}`
  ).toString("base64");
  return `Basic ${encoded}`;
}

async function hibobFetch(
  path: string,
  credentials: HiBobCredentials
): Promise<Response> {
  const response = await fetch(`${HIBOB_BASE_URL}${path}`, {
    headers: {
      Authorization: makeAuthHeader(credentials),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error("Invalid credentials — check service user ID and token");
    if (status === 403) throw new Error("Permission denied — service user needs read access for this scope");
    if (status === 404) throw new Error("Endpoint not found — this HiBob instance may not support this feature");
    throw new Error(`HiBob API returned HTTP ${status}`);
  }

  return response;
}

/** Extract string names from various possible HiBob response shapes */
function extractNames(data: unknown): string[] {
  // Shape 1: bare array of objects with "name" field — [{ name: "Holiday" }, ...]
  if (Array.isArray(data)) {
    return data
      .map((item: Record<string, unknown>) =>
        typeof item === "string" ? item : (item.name as string) || (item.policyName as string) || (item.displayName as string)
      )
      .filter(Boolean);
  }

  // Shape 2: wrapper object with a known array key
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    // Try common wrapper keys: policyTypes, policy_types, types, items, values, data
    for (const key of ["policyTypes", "policy_types", "types", "items", "values", "data"]) {
      if (Array.isArray(obj[key])) {
        return extractNames(obj[key]);
      }
    }

    // If object has entries, try to extract names from the values
    // e.g. { "Holiday": { ... }, "Sick Leave": { ... } }
    const keys = Object.keys(obj);
    if (keys.length > 0 && typeof obj[keys[0]] === "object") {
      return keys;
    }
  }

  return [];
}

/** Fetch leave policy types */
async function fetchLeaveTypes(credentials: HiBobCredentials): Promise<string[]> {
  const response = await hibobFetch("/timeoff/policy-types", credentials);
  const data = await response.json();

  console.log("[hibob-mapping] Leave types raw response shape:", JSON.stringify(data).slice(0, 500));

  const names = extractNames(data);
  if (names.length > 0) return names;

  // If nothing parsed, log for debugging
  console.warn("[hibob-mapping] Could not extract leave type names from response:", typeof data);
  return [];
}

/** Fetch locations from the "site" named list */
async function fetchLocations(credentials: HiBobCredentials): Promise<string[]> {
  const response = await hibobFetch("/company/named-lists/site", credentials);
  const data = await response.json();

  return flattenNamedList(data?.values || []);
}

interface NamedListItem {
  value: string;
  name: string;
  archived: boolean;
  children?: NamedListItem[];
}

/** Flatten a hierarchical named list, filtering out archived items */
function flattenNamedList(items: NamedListItem[]): string[] {
  const result: string[] = [];

  for (const item of items) {
    if (!item.archived) {
      result.push(item.value || item.name);
      if (item.children?.length) {
        result.push(...flattenNamedList(item.children));
      }
    }
  }

  return result;
}

/** Search keywords for discovering fields by category */
const FIELD_SEARCH_KEYWORDS: Record<string, string[]> = {
  pay_categories: ["pay cat", "earning", "pay category"],
  employment_contracts: ["employment type", "contract", "employment.contract"],
  pay_frequencies: ["pay frequency", "pay cycle", "payFrequency"],
  pay_periods: ["pay period", "payPeriod"],
  termination_reasons: ["termination", "cessation", "reason for leaving", "lifecycle.terminationReason"],
};

/** Friendly labels for warning messages */
const CATEGORY_LABELS: Record<string, string> = {
  pay_categories: "pay categories",
  employment_contracts: "employment contracts",
  pay_frequencies: "pay frequencies",
  pay_periods: "pay periods",
  termination_reasons: "termination reasons",
};

interface HiBobField {
  id: string;
  name: string;
  category?: string;
  type: string;
  typeData?: {
    listId?: string;
  };
}

/** Discover named list fields from the people fields metadata */
async function discoverFieldValues(
  credentials: HiBobCredentials,
  category: MappingCategory
): Promise<string[] | null> {
  const keywords = FIELD_SEARCH_KEYWORDS[category];
  if (!keywords) return null;

  const response = await hibobFetch("/company/people/fields", credentials);
  const data = await response.json();

  // The fields endpoint may return an array or a wrapper object
  let fields: HiBobField[] = [];
  if (Array.isArray(data)) {
    fields = data;
  } else if (data && typeof data === "object") {
    // Try common wrapper keys
    const obj = data as Record<string, unknown>;
    for (const key of ["fields", "data", "items"]) {
      if (Array.isArray(obj[key])) {
        fields = obj[key] as HiBobField[];
        break;
      }
    }
  }

  if (fields.length === 0) {
    console.warn("[hibob-mapping] No fields found in people/fields response for", category);
    return null;
  }

  // Search for a matching field with a listId
  for (const field of fields) {
    const fieldIdentifier = `${field.id} ${field.name}`.toLowerCase();

    for (const keyword of keywords) {
      if (fieldIdentifier.includes(keyword.toLowerCase())) {
        if (field.typeData?.listId) {
          // Fetch the named list
          const listResponse = await hibobFetch(
            `/company/named-lists/${field.typeData.listId}`,
            credentials
          );
          const listData = await listResponse.json();
          const values = flattenNamedList(listData?.values || []);

          if (values.length > 0) return values;
        }
      }
    }
  }

  return null;
}

/**
 * Pull all mapping values from HiBob APIs
 * Returns partial results with warnings for any categories that fail
 */
export async function pullHiBobValues(
  credentials: HiBobCredentials
): Promise<PullResult> {
  const values: Record<string, string[]> = {};
  const categoriesPopulated: MappingCategory[] = [];
  const warnings: string[] = [];

  // 1. Leave types (dedicated API)
  try {
    const leaveTypes = await fetchLeaveTypes(credentials);
    if (leaveTypes.length > 0) {
      values.leave_types = leaveTypes;
      categoriesPopulated.push("leave_types");
    } else {
      warnings.push("Leave types: no data returned — check TimeOff read permission. Using defaults.");
      values.leave_types = DEFAULT_HIBOB_VALUES.leave_types;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Leave types: ${msg}. Using defaults.`);
    values.leave_types = DEFAULT_HIBOB_VALUES.leave_types;
  }

  // 2. Locations (named list "site")
  try {
    const locations = await fetchLocations(credentials);
    if (locations.length > 0) {
      values.locations = locations;
      categoriesPopulated.push("locations");
    } else {
      warnings.push("Locations: no sites configured in HiBob. Using defaults.");
      values.locations = DEFAULT_HIBOB_VALUES.locations;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Locations: ${msg}. Using defaults.`);
    values.locations = DEFAULT_HIBOB_VALUES.locations;
  }

  // 3-7. Discovery-based categories
  const discoveryCategories: MappingCategory[] = [
    "pay_categories",
    "employment_contracts",
    "pay_frequencies",
    "pay_periods",
    "termination_reasons",
  ];

  for (const category of discoveryCategories) {
    const label = CATEGORY_LABELS[category] || category;
    try {
      const discovered = await discoverFieldValues(credentials, category);
      if (discovered && discovered.length > 0) {
        values[category] = discovered;
        categoriesPopulated.push(category);
      } else {
        warnings.push(
          `${label}: no matching field found in HiBob — needs People read permission, or field may not exist. Using defaults.`
        );
        values[category] = DEFAULT_HIBOB_VALUES[category];
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`${label}: ${msg}. Using defaults.`);
      values[category] = DEFAULT_HIBOB_VALUES[category];
    }
  }

  return {
    values: values as Record<MappingCategory, string[]>,
    categoriesPopulated,
    warnings,
  };
}
