import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "client"]);
export const clientStatusEnum = pgEnum("client_status", ["active", "inactive", "archived"]);
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "in_progress",
  "review",
  "completed",
  "on_hold",
]);

// Ticket enums
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "waiting_on_client",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const ticketTypeEnum = pgEnum("ticket_type", [
  "general_support",
  "project_issue",
  "feature_request",
  "bug_report",
]);

// Invite enums
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
]);

// Integration enums
export const integrationServiceTypeEnum = pgEnum("integration_service_type", [
  "hibob",
  "workato",
  "keypay",
  "adp",
  "netsuite",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "healthy",
  "degraded",
  "down",
  "unknown",
]);

// Phase enums
export const phaseStatusEnum = pgEnum("phase_status", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

// Users Table (Simplified - Clerk is source of truth for profile data)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  role: userRoleEnum("role").notNull().default("client"),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Agencies Table
export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#8B5CF6"),
  domain: varchar("domain", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Clients Table
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  status: clientStatusEnum("status").notNull().default("active"),

  // Support hours tracking
  supportHoursPerMonth: integer("support_hours_per_month").default(0),
  hoursUsedThisMonth: integer("hours_used_this_month").default(0), // Stored in minutes
  supportBillingCycleStart: timestamp("support_billing_cycle_start"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Projects Table
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("planning"),
    startDate: timestamp("start_date"),
    dueDate: timestamp("due_date"),

    // Project phases
    currentPhaseId: uuid("current_phase_id"),
    phaseTemplateId: uuid("phase_template_id").references(() => phaseTemplates.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    clientIdx: index("projects_client_idx").on(table.clientId),
    statusIdx: index("projects_status_idx").on(table.status),
  })
);

// Files Table
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    projectIdx: index("files_project_idx").on(table.projectId),
    uploadedByIdx: index("files_uploaded_by_idx").on(table.uploadedBy),
    deletedAtIdx: index("files_deleted_at_idx").on(table.deletedAt),
  })
);

// Messages Table
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    projectIdx: index("messages_project_idx").on(table.projectId),
    senderIdx: index("messages_sender_idx").on(table.senderId),
    unreadIdx: index("messages_unread_idx").on(table.read, table.projectId),
  })
);

// Client Activity Table (Track engagement metrics)
export const clientActivity = pgTable("client_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  lastLogin: timestamp("last_login"),
  lastMessageSent: timestamp("last_message_sent"),
  lastFileDownloaded: timestamp("last_file_downloaded"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tickets Table
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Core fields
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    type: ticketTypeEnum("type").notNull().default("general_support"),
    status: ticketStatusEnum("status").notNull().default("open"),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),

    // Relationships
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }), // Optional - for project-specific tickets

    // Assignment
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "set null" })
      .notNull(),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at"),

    // Resolution
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolution: text("resolution"), // Summary of how it was resolved

    // Time tracking
    estimatedMinutes: integer("estimated_minutes"),
    timeSpentMinutes: integer("time_spent_minutes").default(0),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    clientIdx: index("tickets_client_idx").on(table.clientId),
    projectIdx: index("tickets_project_idx").on(table.projectId),
    statusIdx: index("tickets_status_idx").on(table.status),
    assignedToIdx: index("tickets_assigned_to_idx").on(table.assignedTo),
  })
);

// Ticket Comments Table
export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .references(() => tickets.id, { onDelete: "cascade" })
      .notNull(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "set null" })
      .notNull(),
    content: text("content").notNull(),
    isInternal: boolean("is_internal").notNull().default(false), // Internal notes (client can't see)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    ticketIdx: index("ticket_comments_ticket_idx").on(table.ticketId),
    authorIdx: index("ticket_comments_author_idx").on(table.authorId),
  })
);

// Invites Table (for onboarding team members and clients)
export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    role: userRoleEnum("role").notNull(), // What role they'll get
    status: inviteStatusEnum("status").notNull().default("pending"),

    // For client invites, link to client
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),

    // Who sent the invite
    invitedBy: uuid("invited_by")
      .references(() => users.id, { onDelete: "set null" })
      .notNull(),

    // Expiration
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("invites_email_idx").on(table.email),
    tokenIdx: index("invites_token_idx").on(table.token),
    statusIdx: index("invites_status_idx").on(table.status),
  })
);

// Support Hour Logs Table (Historical tracking)
export const supportHourLogs = pgTable(
  "support_hour_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    allocatedMinutes: integer("allocated_minutes").notNull(),
    usedMinutes: integer("used_minutes").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("support_hour_logs_client_idx").on(table.clientId),
  })
);

// Ticket Time Entries Table (Detailed time logging)
export const ticketTimeEntries = pgTable(
  "ticket_time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .references(() => tickets.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "set null" })
      .notNull(),
    minutes: integer("minutes").notNull(),
    description: text("description"),
    loggedAt: timestamp("logged_at").defaultNow().notNull(),
    countTowardsSupportHours: boolean("count_towards_support_hours")
      .default(true)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    ticketIdx: index("ticket_time_entries_ticket_idx").on(table.ticketId),
    userIdx: index("ticket_time_entries_user_idx").on(table.userId),
  })
);

// Integration Monitors Table (Per-project integrations)
export const integrationMonitors = pgTable(
  "integration_monitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(), // Kept for convenience in querying
    serviceType: integrationServiceTypeEnum("service_type").notNull(),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    workatoCredentials: text("workato_credentials"), // Encrypted JSON for Workato only
    workatoRecipeIds: text("workato_recipe_ids"), // JSON array of recipe IDs (kept for reference)
    isEnabled: boolean("is_enabled").default(true).notNull(),
    checkIntervalMinutes: integer("check_interval_minutes").default(5).notNull(),
    lastCheckedAt: timestamp("last_checked_at"),
    currentStatus: integrationStatusEnum("current_status").default("unknown"),
    lastErrorMessage: text("last_error_message"),
    alertEnabled: boolean("alert_enabled").default(true).notNull(),
    alertChannels: text("alert_channels"), // JSON: ["email", "in_app"]
    alertThresholdMinutes: integer("alert_threshold_minutes").default(15).notNull(),
    lastAlertSentAt: timestamp("last_alert_sent_at"),
    platformStatusUrl: text("platform_status_url"), // e.g., https://status.hibob.io
    checkPlatformStatus: boolean("check_platform_status").default(true).notNull(),
    platformStatus: text("platform_status"), // "operational", "degraded", "major_outage", "maintenance"
    platformIncidents: text("platform_incidents"), // JSON array of active incidents
    platformLastChecked: timestamp("platform_last_checked"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    projectIdx: index("integration_monitors_project_idx").on(table.projectId),
    clientIdx: index("integration_monitors_client_idx").on(table.clientId),
    statusIdx: index("integration_monitors_status_idx").on(table.currentStatus),
  })
);

// Integration Metrics Table (Health check history)
export const integrationMetrics = pgTable(
  "integration_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monitorId: uuid("monitor_id")
      .references(() => integrationMonitors.id, { onDelete: "cascade" })
      .notNull(),
    status: integrationStatusEnum("status").notNull(),
    responseTimeMs: integer("response_time_ms"),
    errorMessage: text("error_message"),
    workatoRecipeCount: integer("workato_recipe_count"), // Simple count of total recipes
    workatoRunningCount: integer("workato_running_count"), // Count of running recipes
    workatoStoppedCount: integer("workato_stopped_count"), // Count of stopped recipes
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    monitorIdx: index("integration_metrics_monitor_idx").on(table.monitorId),
    checkedAtIdx: index("integration_metrics_checked_at_idx").on(table.checkedAt),
  })
);

// Integration Alerts Table (Alert history and tracking)
export const integrationAlerts = pgTable(
  "integration_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monitorId: uuid("monitor_id")
      .references(() => integrationMonitors.id, { onDelete: "cascade" })
      .notNull(),
    alertType: text("alert_type").notNull(), // "down", "degraded", "recovered"
    severity: text("severity").notNull(), // "critical", "warning", "info"
    message: text("message").notNull(),
    errorDetails: text("error_details"),
    channels: text("channels").notNull(), // JSON: ["email", "in_app"]
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  },
  (table) => ({
    monitorIdx: index("integration_alerts_monitor_idx").on(table.monitorId),
    sentAtIdx: index("integration_alerts_sent_at_idx").on(table.sentAt),
  })
);

// User Notifications Table (In-app notifications)
export const userNotifications = pgTable(
  "user_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(), // "integration_alert", "ticket_update", etc.
    title: text("title").notNull(),
    message: text("message").notNull(),
    linkUrl: text("link_url"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("user_notifications_user_idx").on(table.userId),
    isReadIdx: index("user_notifications_is_read_idx").on(table.isRead),
    createdAtIdx: index("user_notifications_created_at_idx").on(table.createdAt),
  })
);

// Phase Templates Table (Reusable phase definitions)
export const phaseTemplates = pgTable("phase_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Template Phases Table (Phases within a template)
export const templatePhases = pgTable(
  "template_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .references(() => phaseTemplates.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull(),
    estimatedDays: integer("estimated_days"),
    color: varchar("color", { length: 7 }),
  },
  (table) => ({
    templateIdx: index("template_phases_template_idx").on(table.templateId),
    orderIdx: index("template_phases_order_idx").on(table.orderIndex),
  })
);

// Project Phases Table (Actual phases on a project)
export const projectPhases = pgTable(
  "project_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull(),
    status: phaseStatusEnum("status").default("pending").notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("project_phases_project_idx").on(table.projectId),
    orderIdx: index("project_phases_order_idx").on(table.orderIndex),
  })
);

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  agency: one(agencies, {
    fields: [users.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [users.clientId],
    references: [clients.id],
  }),
}));

export const agenciesRelations = relations(agencies, ({ many }) => ({
  users: many(users),
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [clients.agencyId],
    references: [agencies.id],
  }),
  projects: many(projects),
  users: many(users),
  activity: one(clientActivity),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  files: many(files),
  messages: many(messages),
  phases: many(projectPhases),
  currentPhase: one(projectPhases, {
    fields: [projects.currentPhaseId],
    references: [projectPhases.id],
    relationName: "currentPhase",
  }),
  phaseTemplate: one(phaseTemplates, {
    fields: [projects.phaseTemplateId],
    references: [phaseTemplates.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const clientActivityRelations = relations(clientActivity, ({ one }) => ({
  client: one(clients, {
    fields: [clientActivity.clientId],
    references: [clients.id],
  }),
}));

// Ticket Relations
export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  client: one(clients, {
    fields: [tickets.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [tickets.createdBy],
    references: [users.id],
    relationName: "ticketCreator",
  }),
  assignee: one(users, {
    fields: [tickets.assignedTo],
    references: [users.id],
    relationName: "ticketAssignee",
  }),
  resolver: one(users, {
    fields: [tickets.resolvedBy],
    references: [users.id],
    relationName: "ticketResolver",
  }),
  comments: many(ticketComments),
  timeEntries: many(ticketTimeEntries),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [ticketComments.authorId],
    references: [users.id],
  }),
}));

// Invite Relations
export const invitesRelations = relations(invites, ({ one }) => ({
  client: one(clients, {
    fields: [invites.clientId],
    references: [clients.id],
  }),
  inviter: one(users, {
    fields: [invites.invitedBy],
    references: [users.id],
  }),
}));

// Support Hour Logs Relations
export const supportHourLogsRelations = relations(supportHourLogs, ({ one }) => ({
  client: one(clients, {
    fields: [supportHourLogs.clientId],
    references: [clients.id],
  }),
}));

// Ticket Time Entries Relations
export const ticketTimeEntriesRelations = relations(ticketTimeEntries, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketTimeEntries.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketTimeEntries.userId],
    references: [users.id],
  }),
}));

// Integration Monitors Relations
export const integrationMonitorsRelations = relations(integrationMonitors, ({ one, many }) => ({
  client: one(clients, {
    fields: [integrationMonitors.clientId],
    references: [clients.id],
  }),
  metrics: many(integrationMetrics),
}));

// Integration Metrics Relations
export const integrationMetricsRelations = relations(integrationMetrics, ({ one }) => ({
  monitor: one(integrationMonitors, {
    fields: [integrationMetrics.monitorId],
    references: [integrationMonitors.id],
  }),
}));

// Phase Templates Relations
export const phaseTemplatesRelations = relations(phaseTemplates, ({ many }) => ({
  templatePhases: many(templatePhases),
  projects: many(projects),
}));

// Template Phases Relations
export const templatePhasesRelations = relations(templatePhases, ({ one }) => ({
  template: one(phaseTemplates, {
    fields: [templatePhases.templateId],
    references: [phaseTemplates.id],
  }),
}));

// Project Phases Relations
export const projectPhasesRelations = relations(projectPhases, ({ one }) => ({
  project: one(projects, {
    fields: [projectPhases.projectId],
    references: [projects.id],
  }),
}));
