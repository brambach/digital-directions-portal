/**
 * KeyPay (Employment Hero) API integration for fetching mapping values
 * Base URL: https://api.yourpayroll.com.au/api/v2/
 * Auth: Bearer token
 */

import type { KeyPayCredentials } from "@/lib/crypto";
import type { MappingCategory } from "@/lib/mapping-defaults";
import { DEFAULT_KEYPAY_VALUES } from "@/lib/mapping-defaults";

const KEYPAY_BASE_URL = "https://api.yourpayroll.com.au/api/v2";

interface PullResult {
  values: Record<MappingCategory, string[]>;
  categoriesPopulated: MappingCategory[];
  warnings: string[];
}

/** Standard STP Phase 2 termination/cessation codes */
const STP_TERMINATION_REASONS = [
  "Voluntary Cessation",
  "Ill Health",
  "Deceased",
  "Redundancy",
  "Dismissal",
  "Transfer",
  "Contract Cessation",
];

async function keypayFetch(
  path: string,
  credentials: KeyPayCredentials
): Promise<Response> {
  // KeyPay uses HTTP Basic Auth: API key as username, empty password
  const encoded = Buffer.from(`${credentials.apiKey}:`).toString("base64");
  const response = await fetch(`${KEYPAY_BASE_URL}${path}`, {
    headers: {
      Authorization: `Basic ${encoded}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error("Invalid API key — check the key is correct and active");
    if (status === 403) throw new Error("Permission denied — API key lacks access to this resource");
    if (status === 404) throw new Error("Not found — check Business ID is correct");
    throw new Error(`KeyPay API returned HTTP ${status}`);
  }

  return response;
}

/** Fetch leave categories */
async function fetchLeaveCategories(credentials: KeyPayCredentials): Promise<string[]> {
  const response = await keypayFetch(
    `/business/${credentials.businessId}/leavecategory`,
    credentials
  );
  const data = await response.json();

  if (Array.isArray(data)) {
    return data.map((item: { name: string }) => item.name).filter(Boolean);
  }
  return [];
}

/** Fetch locations */
async function fetchLocations(credentials: KeyPayCredentials): Promise<string[]> {
  const response = await keypayFetch(
    `/business/${credentials.businessId}/location`,
    credentials
  );
  const data = await response.json();

  if (Array.isArray(data)) {
    return data.map((item: { name: string }) => item.name).filter(Boolean);
  }
  return [];
}

interface PaySchedule {
  id: number;
  name: string;
  frequency: string;
}

/** Fetch pay schedules (used for both pay_periods and pay_frequencies) */
async function fetchPaySchedules(credentials: KeyPayCredentials): Promise<PaySchedule[]> {
  const response = await keypayFetch(
    `/business/${credentials.businessId}/payschedule`,
    credentials
  );
  const data = await response.json();

  if (Array.isArray(data)) return data;
  return [];
}

/** Fetch employment agreements */
async function fetchEmploymentAgreements(credentials: KeyPayCredentials): Promise<string[]> {
  const response = await keypayFetch(
    `/business/${credentials.businessId}/employmentagreement`,
    credentials
  );
  const data = await response.json();

  if (Array.isArray(data)) {
    return data.map((item: { name: string }) => item.name).filter(Boolean);
  }
  return [];
}

/** Fetch pay categories — filters out system categories by default */
async function fetchPayCategories(credentials: KeyPayCredentials): Promise<string[]> {
  const response = await keypayFetch(
    `/business/${credentials.businessId}/paycategory`,
    credentials
  );
  const data = await response.json();

  if (Array.isArray(data)) {
    // Filter out system pay categories (generic KeyPay defaults that clutter the list)
    const userCategories = data.filter(
      (item: { isSystemPayCategory?: boolean }) => !item.isSystemPayCategory
    );
    return userCategories.map((item: { name: string }) => item.name).filter(Boolean);
  }
  return [];
}

/**
 * Pull all mapping values from KeyPay APIs
 * Returns partial results with warnings for any categories that fail
 */
export async function pullKeyPayValues(
  credentials: KeyPayCredentials
): Promise<PullResult> {
  const values: Record<string, string[]> = {};
  const categoriesPopulated: MappingCategory[] = [];
  const warnings: string[] = [];

  // 1. Leave categories
  try {
    const leaveCategories = await fetchLeaveCategories(credentials);
    if (leaveCategories.length > 0) {
      values.leave_types = leaveCategories;
      categoriesPopulated.push("leave_types");
    } else {
      warnings.push("No leave categories found — using defaults");
      values.leave_types = DEFAULT_KEYPAY_VALUES.leave_types;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Could not fetch leave categories: ${msg}`);
    values.leave_types = DEFAULT_KEYPAY_VALUES.leave_types;
  }

  // 2. Locations
  try {
    const locations = await fetchLocations(credentials);
    if (locations.length > 0) {
      values.locations = locations;
      categoriesPopulated.push("locations");
    } else {
      warnings.push("No locations found — using defaults");
      values.locations = DEFAULT_KEYPAY_VALUES.locations;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Could not fetch locations: ${msg}`);
    values.locations = DEFAULT_KEYPAY_VALUES.locations;
  }

  // 3 & 4. Pay schedules → pay_periods + pay_frequencies
  try {
    const schedules = await fetchPaySchedules(credentials);
    if (schedules.length > 0) {
      // pay_periods = schedule names
      values.pay_periods = schedules.map((s) => s.name).filter(Boolean);
      categoriesPopulated.push("pay_periods");

      // pay_frequencies = deduplicated frequency values
      const frequencies = [...new Set(schedules.map((s) => s.frequency).filter(Boolean))];
      if (frequencies.length > 0) {
        values.pay_frequencies = frequencies;
        categoriesPopulated.push("pay_frequencies");
      } else {
        values.pay_frequencies = DEFAULT_KEYPAY_VALUES.pay_frequencies;
      }
    } else {
      warnings.push("No pay schedules found — using defaults for pay periods and frequencies");
      values.pay_periods = DEFAULT_KEYPAY_VALUES.pay_periods;
      values.pay_frequencies = DEFAULT_KEYPAY_VALUES.pay_frequencies;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Could not fetch pay schedules: ${msg}`);
    values.pay_periods = DEFAULT_KEYPAY_VALUES.pay_periods;
    values.pay_frequencies = DEFAULT_KEYPAY_VALUES.pay_frequencies;
  }

  // 5. Employment agreements
  try {
    const agreements = await fetchEmploymentAgreements(credentials);
    if (agreements.length > 0) {
      values.employment_contracts = agreements;
      categoriesPopulated.push("employment_contracts");
    } else {
      warnings.push("No employment agreements found — using defaults");
      values.employment_contracts = DEFAULT_KEYPAY_VALUES.employment_contracts;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Could not fetch employment agreements: ${msg}`);
    values.employment_contracts = DEFAULT_KEYPAY_VALUES.employment_contracts;
  }

  // 6. Pay categories
  try {
    const payCategories = await fetchPayCategories(credentials);
    if (payCategories.length > 0) {
      values.pay_categories = payCategories;
      categoriesPopulated.push("pay_categories");
    } else {
      warnings.push("No pay categories found — using defaults");
      values.pay_categories = DEFAULT_KEYPAY_VALUES.pay_categories;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Could not fetch pay categories: ${msg}`);
    values.pay_categories = DEFAULT_KEYPAY_VALUES.pay_categories;
  }

  // 7. Termination reasons (hardcoded STP Phase 2 cessation codes)
  values.termination_reasons = STP_TERMINATION_REASONS;
  categoriesPopulated.push("termination_reasons");
  warnings.push("Termination reasons: using standard STP Phase 2 cessation codes");

  return {
    values: values as Record<MappingCategory, string[]>,
    categoriesPopulated,
    warnings,
  };
}
