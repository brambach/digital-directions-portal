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
