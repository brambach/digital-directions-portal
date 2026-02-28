/**
 * Make a user an admin in both Clerk and Database
 *
 * Usage:
 * npm run make-admin <email>
 *
 * Example:
 * npm run make-admin bryce@example.com
 *
 * Note: The user must have already signed up in Clerk.
 * To invite a new admin who hasn't signed up yet, use:
 *   npm run invite-admin <email>
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { clerkClient } from "@clerk/nextjs/server";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function makeAdmin(email: string) {
  console.log(`\n🔍 Looking for user: ${email}...`);

  try {
    // Get Clerk client
    const clerk = await clerkClient();

    // Find user in Clerk by email
    const clerkUsers = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (clerkUsers.data.length === 0) {
      console.error(`❌ User not found in Clerk: ${email}`);
      console.log("\nMake sure you've signed up first!");
      process.exit(1);
    }

    const clerkUser = clerkUsers.data[0];
    console.log(`✅ Found user in Clerk: ${clerkUser.id}`);

    // Update role in Clerk metadata
    await clerk.users.updateUser(clerkUser.id, {
      publicMetadata: {
        role: "admin",
      },
    });
    console.log("✅ Updated role in Clerk to 'admin'");

    // Update role in database
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUser.id))
      .limit(1)
      .then((rows) => rows[0]);

    if (dbUser) {
      await db
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.id, dbUser.id));
      console.log("✅ Updated role in Database to 'admin'");
    } else {
      console.log("⚠️  User not found in database (will be created on next login)");
    }

    console.log("\n🎉 Success! User is now an admin.");
    console.log("💡 Sign out and sign back in to see admin dashboard.");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("\nUsage: npm run make-admin <email>");
  console.log("Example: npm run make-admin bryce@example.com");
  process.exit(1);
}

makeAdmin(email);
