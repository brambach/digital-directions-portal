/**
 * Remove a client and all associated data by email
 *
 * Usage: npx tsx scripts/cleanup-client.ts <email>
 * Example: npx tsx scripts/cleanup-client.ts bryce@brycedigital.io
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";

const db = drizzle(sql);

import {
  users,
  clients,
  projects,
  messages,
  files,
  tickets,
  ticketComments,
  invites,
  projectPhases,
  integrationMonitors,
  userNotifications,
} from "../src/lib/db/schema";
import { eq, inArray } from "drizzle-orm";


async function cleanupClient(email: string) {
  console.log(`\n🔍 Looking for invite/user with email: ${email}...`);

  // 1. Find invite(s) for this email
  const matchingInvites = await db
    .select()
    .from(invites)
    .where(eq(invites.email, email));

  if (matchingInvites.length > 0) {
    console.log(`Found ${matchingInvites.length} invite(s) for ${email}`);
  }

  // 2. Find user(s) in DB with this clientId (via invite or direct lookup)
  // We'll find clients that were invited at this email
  const clientIds = [...new Set(matchingInvites.map((i) => i.clientId).filter(Boolean) as string[])];

  // Also check if there's a user record with this email-linked clerkId
  // (We don't store email in DB, so rely on invites)

  if (clientIds.length === 0) {
    console.log("⚠️  No client found via invites for that email.");
    console.log("Searching for users linked to this email invite...");
    process.exit(0);
  }

  console.log(`\nFound client IDs: ${clientIds.join(", ")}`);

  for (const clientId of clientIds) {
    console.log(`\n--- Cleaning up client: ${clientId} ---`);

    // 3. Find all projects for this client
    const clientProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.clientId, clientId));

    console.log(`  Projects: ${clientProjects.length}`);

    const projectIds = clientProjects.map((p) => p.id);

    if (projectIds.length > 0) {
      // Delete integration monitors
      await db.delete(integrationMonitors).where(inArray(integrationMonitors.projectId, projectIds));
      console.log("  ✅ Deleted integration monitors");

      // Delete project phases
      await db.delete(projectPhases).where(inArray(projectPhases.projectId, projectIds));
      console.log("  ✅ Deleted project phases");

      // Delete messages
      await db.delete(messages).where(inArray(messages.projectId, projectIds));
      console.log("  ✅ Deleted messages");

      // Delete files
      await db.delete(files).where(inArray(files.projectId, projectIds));
      console.log("  ✅ Deleted files");

      // Find all tickets for these projects
      const projectTickets = await db
        .select({ id: tickets.id })
        .from(tickets)
        .where(inArray(tickets.projectId, projectIds));

      const ticketIds = projectTickets.map((t) => t.id);

      if (ticketIds.length > 0) {
        await db.delete(ticketComments).where(inArray(ticketComments.ticketId, ticketIds));
        await db.delete(tickets).where(inArray(tickets.id, ticketIds));
        console.log("  ✅ Deleted tickets and related data");
      }

      // Delete projects
      await db.delete(projects).where(inArray(projects.id, projectIds));
      console.log("  ✅ Deleted projects");
    }

    // 4. Delete notifications for users of this client
    const clientUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clientId, clientId));

    const userIds = clientUsers.map((u) => u.id);

    if (userIds.length > 0) {
      await db.delete(userNotifications).where(inArray(userNotifications.userId, userIds));
      console.log("  ✅ Deleted user notifications");

      // Delete users
      await db.delete(users).where(inArray(users.id, userIds));
      console.log("  ✅ Deleted users");
    }

    // 5. Delete invites
    await db.delete(invites).where(eq(invites.clientId, clientId));
    console.log("  ✅ Deleted invites");

    // 6. Delete the client
    await db.delete(clients).where(eq(clients.id, clientId));
    console.log("  ✅ Deleted client record");
  }

  console.log("\n🎉 Cleanup complete! You can now re-invite the client fresh.");
}

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("\nUsage: npx tsx scripts/cleanup-client.ts <email>");
  process.exit(1);
}

cleanupClient(email).catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
