import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

const f = createUploadthing();

export const ourFileRouter = {
  projectFile: f({
    image: { maxFileSize: "32MB", maxFileCount: 10 },
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    "application/zip": { maxFileSize: "32MB", maxFileCount: 2 },
    "application/msword": { maxFileSize: "32MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "32MB",
      maxFileCount: 5,
    },
    "application/vnd.ms-excel": { maxFileSize: "32MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "32MB",
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("Unauthorized");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user) {
        throw new UploadThingError("User not found");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.url,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  agencyLogo: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("Unauthorized");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user || user.role !== "admin") {
        throw new UploadThingError("Only admins can upload agency logos");
      }

      return { userId: user.id, agencyId: user.agencyId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        url: file.url,
        agencyId: metadata.agencyId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
