import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql as sqlClient } from "@vercel/postgres";
import { users, ticketComments } from "./schema";
import { createClerkClient } from "@clerk/backend";
import { eq, inArray } from "drizzle-orm";

const db = drizzle(sqlClient);

async function cleanupUsers() {
  console.log("🧹 Cleaning up orphaned users (deleted from Clerk)...\n");

  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    // Get all users from the database, skip the placeholder seed user
    const dbUsers = await db.select().from(users);
    const realUsers = dbUsers.filter((u) => u.clerkId !== "placeholder_clerk_id");
    console.log(`Found ${realUsers.length} real user(s) in database (excluding seed placeholder).`);

    const toDelete: typeof dbUsers = [];

    for (const user of realUsers) {
      try {
        await clerk.users.getUser(user.clerkId);
        console.log(`  ✓ ${user.clerkId} — exists in Clerk, keeping`);
      } catch {
        console.log(`  ✗ ${user.clerkId} — not found in Clerk, will delete`);
        toDelete.push(user);
      }
    }

    if (toDelete.length === 0) {
      console.log("\nNo orphaned users found. Nothing to delete.");
      process.exit(0);
    }

    const orphanIds = toDelete.map((u) => u.id);

    // Delete ticket comments by these users first (schema conflict: authorId is notNull + onDelete:set null)
    const deletedComments = await db
      .delete(ticketComments)
      .where(inArray(ticketComments.authorId, orphanIds));
    console.log(`\n  → Deleted ticket comments by orphaned users`);

    // Now delete the orphaned users
    console.log(`Deleting ${toDelete.length} orphaned user(s)...`);
    for (const user of toDelete) {
      await db.delete(users).where(eq(users.id, user.id));
      console.log(`  ✓ Deleted user ${user.id} (clerkId: ${user.clerkId})`);
    }

    console.log("\n✅ Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupUsers();
