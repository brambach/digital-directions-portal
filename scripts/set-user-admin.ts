import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import { users } from "../src/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

const db = drizzle(sql);

async function setUserAdmin() {
  const email = "bryce.rambach@gmail.com"; // Update this if needed

  console.log(`🔍 Looking for user with email: ${email}...`);

  try {
    // Find all non-deleted users
    const allUsers = await db
      .select()
      .from(users)
      .where(isNull(users.deletedAt));

    console.log("\n📋 Current users:");
    allUsers.forEach((user) => {
      console.log(`  - Clerk ID: ${user.clerkId}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Client ID: ${user.clientId}`);
      console.log(`    Agency ID: ${user.agencyId}`);
      console.log("");
    });

    // Get the user to update - assuming it's the most recent one or you can specify clerk ID
    console.log("💡 Enter the Clerk ID of the user you want to set as admin:");
    console.log("   (Check Clerk dashboard or the list above)");
    console.log("\n   For now, I'll update the most recent user...\n");

    // Update the most recent user (likely you after sign up)
    const userToUpdate = allUsers[allUsers.length - 1];

    if (!userToUpdate) {
      console.log("❌ No users found");
      process.exit(1);
    }

    console.log(`🔄 Updating user: ${userToUpdate.clerkId}`);
    console.log(`   Current role: ${userToUpdate.role}`);
    console.log(`   New role: admin`);

    await db
      .update(users)
      .set({
        role: "admin",
        clientId: null, // Remove client association
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userToUpdate.clerkId));

    console.log("\n✅ User role updated to admin!");
    console.log("   Client ID removed");
    console.log("\n💡 Refresh your browser to see the admin dashboard");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

setUserAdmin();
