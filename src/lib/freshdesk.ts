/**
 * Freshdesk API Client
 *
 * Thin wrapper over the Freshdesk v2 REST API.
 * All ticket data flows through Freshdesk as the backend;
 * the portal DB stores a lightweight reference (freshdeskId, freshdeskUrl).
 *
 * Auth: Basic auth — API key as username, "X" as password.
 * Docs: https://developers.freshdesk.com/api/
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FRESHDESK_DOMAIN = process.env.FRESHDESK_DOMAIN;
const FRESHDESK_API_KEY = process.env.FRESHDESK_API_KEY;

function getBaseUrl(): string {
  if (!FRESHDESK_DOMAIN) throw new Error("FRESHDESK_DOMAIN is not configured");
  // Support both "foo.freshdesk.com" and "foo" as input
  const domain = FRESHDESK_DOMAIN.includes(".")
    ? FRESHDESK_DOMAIN
    : `${FRESHDESK_DOMAIN}.freshdesk.com`;
  return `https://${domain}/api/v2`;
}

function getAuthHeader(): string {
  if (!FRESHDESK_API_KEY) throw new Error("FRESHDESK_API_KEY is not configured");
  return `Basic ${Buffer.from(`${FRESHDESK_API_KEY}:X`).toString("base64")}`;
}

export function isFreshdeskConfigured(): boolean {
  return Boolean(FRESHDESK_DOMAIN && FRESHDESK_API_KEY);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Freshdesk ticket status codes (numeric) */
export const FreshdeskStatus = {
  Open: 2,
  Pending: 3,
  Resolved: 4,
  Closed: 5,
} as const;

/** Freshdesk ticket priority codes */
export const FreshdeskPriority = {
  Low: 1,
  Medium: 2,
  High: 3,
  Urgent: 4,
} as const;

/** Freshdesk ticket source codes */
export const FreshdeskSource = {
  Email: 1,
  Portal: 2,
  Phone: 3,
  Chat: 7,
  Feedback: 9,
  OutboundEmail: 10,
} as const;

export interface FreshdeskTicket {
  id: number;
  subject: string;
  description: string;
  description_text: string;
  status: number;
  priority: number;
  source: number;
  type: string | null;
  requester_id: number;
  responder_id: number | null;
  company_id: number | null;
  group_id: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  due_by: string | null;
  custom_fields: Record<string, unknown>;
}

export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  incoming: boolean;
  private: boolean;
  user_id: number;
  support_email: string | null;
  created_at: string;
  updated_at: string;
  from_email: string | null;
  to_emails: string[];
}

export interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company_id: number | null;
  active: boolean;
}

export interface FreshdeskCompany {
  id: number;
  name: string;
  domains: string[];
}

// ---------------------------------------------------------------------------
// Mapping helpers — Portal ↔ Freshdesk
// ---------------------------------------------------------------------------

/** Map portal priority string → Freshdesk priority number */
export function toFreshdeskPriority(portalPriority: string): number {
  const map: Record<string, number> = {
    low: FreshdeskPriority.Low,
    medium: FreshdeskPriority.Medium,
    high: FreshdeskPriority.High,
    urgent: FreshdeskPriority.Urgent,
  };
  return map[portalPriority] ?? FreshdeskPriority.Medium;
}

/** Map Freshdesk priority number → portal priority string */
export function fromFreshdeskPriority(fdPriority: number): string {
  const map: Record<number, string> = {
    [FreshdeskPriority.Low]: "low",
    [FreshdeskPriority.Medium]: "medium",
    [FreshdeskPriority.High]: "high",
    [FreshdeskPriority.Urgent]: "urgent",
  };
  return map[fdPriority] ?? "medium";
}

/** Map portal status string → Freshdesk status number */
export function toFreshdeskStatus(portalStatus: string): number {
  const map: Record<string, number> = {
    open: FreshdeskStatus.Open,
    in_progress: FreshdeskStatus.Open, // Freshdesk doesn't have "in_progress" — stays Open
    waiting_on_client: FreshdeskStatus.Pending,
    resolved: FreshdeskStatus.Resolved,
    closed: FreshdeskStatus.Closed,
  };
  return map[portalStatus] ?? FreshdeskStatus.Open;
}

/** Map Freshdesk status number → portal status string */
export function fromFreshdeskStatus(fdStatus: number): string {
  const map: Record<number, string> = {
    [FreshdeskStatus.Open]: "open",
    [FreshdeskStatus.Pending]: "waiting_on_client",
    [FreshdeskStatus.Resolved]: "resolved",
    [FreshdeskStatus.Closed]: "closed",
  };
  return map[fdStatus] ?? "open";
}

/** Map portal ticket type → Freshdesk type string (custom field) */
export function toFreshdeskType(portalType: string): string {
  const map: Record<string, string> = {
    general_support: "Question",
    project_issue: "Problem",
    feature_request: "Feature Request",
    bug_report: "Problem",
  };
  return map[portalType] ?? "Question";
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface FreshdeskRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
}

async function freshdeskRequest<T>(options: FreshdeskRequestOptions): Promise<T> {
  const { method, path, body } = options;
  const url = `${getBaseUrl()}${path}`;

  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(`Freshdesk API error [${method} ${path}]: ${response.status} — ${errorText}`);
    throw new Error(`Freshdesk API error: ${response.status} ${response.statusText}`);
  }

  // DELETE returns 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Ticket operations
// ---------------------------------------------------------------------------

export interface CreateTicketParams {
  subject: string;
  description: string;
  email: string; // requester email — Freshdesk auto-creates contact
  priority: string; // portal priority string
  type: string; // portal type string
  tags?: string[];
  companyId?: number;
}

export async function createTicket(params: CreateTicketParams): Promise<FreshdeskTicket> {
  return freshdeskRequest<FreshdeskTicket>({
    method: "POST",
    path: "/tickets",
    body: {
      subject: params.subject,
      description: params.description,
      email: params.email,
      priority: toFreshdeskPriority(params.priority),
      status: FreshdeskStatus.Open,
      source: FreshdeskSource.Portal,
      type: toFreshdeskType(params.type),
      tags: params.tags ?? ["dd-portal"],
      ...(params.companyId ? { company_id: params.companyId } : {}),
    },
  });
}

export interface UpdateTicketParams {
  freshdeskId: number;
  subject?: string;
  description?: string;
  status?: string; // portal status string
  priority?: string; // portal priority string
  type?: string; // portal type string
}

export async function updateTicket(params: UpdateTicketParams): Promise<FreshdeskTicket> {
  const body: Record<string, unknown> = {};
  if (params.subject) body.subject = params.subject;
  if (params.description) body.description = params.description;
  if (params.status) body.status = toFreshdeskStatus(params.status);
  if (params.priority) body.priority = toFreshdeskPriority(params.priority);
  if (params.type) body.type = toFreshdeskType(params.type);

  return freshdeskRequest<FreshdeskTicket>({
    method: "PUT",
    path: `/tickets/${params.freshdeskId}`,
    body,
  });
}

export async function getTicket(freshdeskId: number): Promise<FreshdeskTicket> {
  return freshdeskRequest<FreshdeskTicket>({
    method: "GET",
    path: `/tickets/${freshdeskId}`,
  });
}

// ---------------------------------------------------------------------------
// Conversation (comment/reply) operations
// ---------------------------------------------------------------------------

export async function getTicketConversations(
  freshdeskId: number
): Promise<FreshdeskConversation[]> {
  return freshdeskRequest<FreshdeskConversation[]>({
    method: "GET",
    path: `/tickets/${freshdeskId}/conversations`,
  });
}

export interface AddNoteParams {
  freshdeskId: number;
  body: string; // HTML body
  private: boolean; // true = internal note, false = public reply visible to requester
}

export async function addNote(params: AddNoteParams): Promise<FreshdeskConversation> {
  return freshdeskRequest<FreshdeskConversation>({
    method: "POST",
    path: `/tickets/${params.freshdeskId}/notes`,
    body: {
      body: params.body,
      private: params.private,
    },
  });
}

export interface AddReplyParams {
  freshdeskId: number;
  body: string; // HTML body
}

export async function addReply(params: AddReplyParams): Promise<FreshdeskConversation> {
  return freshdeskRequest<FreshdeskConversation>({
    method: "POST",
    path: `/tickets/${params.freshdeskId}/reply`,
    body: {
      body: params.body,
    },
  });
}

// ---------------------------------------------------------------------------
// Contact operations
// ---------------------------------------------------------------------------

export async function findContactByEmail(email: string): Promise<FreshdeskContact | null> {
  const contacts = await freshdeskRequest<FreshdeskContact[]>({
    method: "GET",
    path: `/contacts?email=${encodeURIComponent(email)}`,
  });
  return contacts.length > 0 ? contacts[0] : null;
}

export async function createContact(params: {
  name: string;
  email: string;
  companyId?: number;
}): Promise<FreshdeskContact> {
  return freshdeskRequest<FreshdeskContact>({
    method: "POST",
    path: "/contacts",
    body: {
      name: params.name,
      email: params.email,
      ...(params.companyId ? { company_id: params.companyId } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Company operations
// ---------------------------------------------------------------------------

export async function findCompanyByName(name: string): Promise<FreshdeskCompany | null> {
  const companies = await freshdeskRequest<FreshdeskCompany[]>({
    method: "GET",
    path: `/companies/autocomplete?name=${encodeURIComponent(name)}`,
  });
  return companies.length > 0 ? companies[0] : null;
}

export async function createCompany(name: string): Promise<FreshdeskCompany> {
  return freshdeskRequest<FreshdeskCompany>({
    method: "POST",
    path: "/companies",
    body: { name },
  });
}

/** Get or create a Freshdesk company by name. Returns the company ID. */
export async function ensureCompany(companyName: string): Promise<number> {
  const existing = await findCompanyByName(companyName);
  if (existing) return existing.id;
  const created = await createCompany(companyName);
  return created.id;
}

// ---------------------------------------------------------------------------
// Utility: Build Freshdesk URL for a ticket
// ---------------------------------------------------------------------------

export function getFreshdeskTicketUrl(freshdeskId: number): string {
  const domain = FRESHDESK_DOMAIN?.includes(".")
    ? FRESHDESK_DOMAIN
    : `${FRESHDESK_DOMAIN}.freshdesk.com`;
  return `https://${domain}/a/tickets/${freshdeskId}`;
}
