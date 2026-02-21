/**
 * Link a user to a client company
 *
 * Usage:
 * npm run link-client <email> <company-name>
 *
 * Examples:
 * npm run link-client bryce@brycedigital.io "Meridian Healthcare"
 * npm run link-client bryce@brycedigital.io  (lists available clients)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClerkClient } from "@clerk/backend";
import { db } from "../src/lib/db";
import { users, clients, agencies } from "../src/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

async function linkClient(email: string, companyName?: string) {
  console.log(`\n🔍 Looking for user: ${email}...`);

  try {
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

    // List available clients if no company name provided
    const allClients = await db
      .select({ id: clients.id, companyName: clients.companyName, status: clients.status })
      .from(clients)
      .where(isNull(clients.deletedAt));

    if (!companyName) {
      console.log("\n📋 Available clients:\n");
      allClients.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.companyName} (${c.status})`);
      });
      console.log(`\nUsage: npm run link-client ${email} "Company Name"`);
      process.exit(0);
    }

    // Find the client
    const client = allClients.find(
      (c) => c.companyName.toLowerCase() === companyName.toLowerCase()
    );

    if (!client) {
      console.error(`❌ Client not found: "${companyName}"`);
      console.log("\nAvailable clients:");
      allClients.forEach((c) => console.log(`  - ${c.companyName}`));
      process.exit(1);
    }

    console.log(`✅ Found client: ${client.companyName}`);

    // Update Clerk metadata
    await clerk.users.updateUser(clerkUser.id, {
      publicMetadata: { role: "client" },
    });
    console.log("✅ Updated Clerk metadata (role: client)");

    // Find or create DB user
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUser.id))
      .limit(1)
      .then((rows) => rows[0]);

    // Get agency
    const [agency] = await db
      .select()
      .from(agencies)
      .where(isNull(agencies.deletedAt))
      .limit(1);

    if (dbUser) {
      await db
        .update(users)
        .set({
          role: "client",
          clientId: client.id,
          agencyId: agency?.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id));
      console.log("✅ Updated existing DB user → linked to client");
    } else {
      await db.insert(users).values({
        clerkId: clerkUser.id,
        role: "client",
        clientId: client.id,
        agencyId: agency?.id ?? null,
      });
      console.log("✅ Created DB user → linked to client");
    }

    console.log(`\n🎉 Success! ${email} is now linked to "${client.companyName}"`);
    console.log("💡 Sign out and sign back in to see client dashboard.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

const email = process.argv[2];
const companyName = process.argv[3];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("\nUsage: npm run link-client <email> <company-name>");
  console.log('Example: npm run link-client bryce@brycedigital.io "Meridian Healthcare"');
  process.exit(1);
}

linkClient(email, companyName);
