import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  users,
  agencies,
  clients,
  projects,
  files,
  messages,
  clientActivity,
} from "./db/schema";

// Inferred types from schema
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Agency = InferSelectModel<typeof agencies>;
export type NewAgency = InferInsertModel<typeof agencies>;

export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

export type File = InferSelectModel<typeof files>;
export type NewFile = InferInsertModel<typeof files>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type ClientActivity = InferSelectModel<typeof clientActivity>;
export type NewClientActivity = InferInsertModel<typeof clientActivity>;

// Extended types with relations
export type UserWithRelations = User & {
  agency?: Agency | null;
  client?: Client | null;
};

// User with Clerk profile data (for display purposes)
export type UserWithProfile = User & {
  email?: string;
  name?: string;
  avatarUrl?: string;
};

export type ClientWithProjects = Client & {
  projects: Project[];
  activity?: ClientActivity;
};

export type ProjectWithDetails = Project & {
  client: Client;
  files: File[];
  messages: MessageWithSender[];
};

export type MessageWithSender = Message & {
  sender: Pick<UserWithProfile, "id" | "name" | "avatarUrl"> | null;
};

export type FileWithUploader = File & {
  uploader: Pick<UserWithProfile, "id" | "name" | "avatarUrl"> | null;
};

// Role types
export type UserRole = "admin" | "client";
export type ClientStatus = "active" | "inactive" | "archived";

// API Response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Clerk metadata types
export interface ClerkPublicMetadata {
  role: UserRole;
  agencyId?: string;
  clientId?: string;
  dbUserId?: string;
}
