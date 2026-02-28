/**
 * Delete a user from both Clerk and the Database
 *
 * Looks up the user by email, deletes them from Clerk, and removes their
 * database record. Related records with notNull FK constraints are handled
 * before deletion (reassigned or deleted as appropriate).
 *
 * Usage:
 * npm run delete-user <email>
 *
 * Example:
 * npm run delete-user jack@digitaldirections.com.au
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClerkClient } from "@clerk/backend";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import { users, ticketComments, tickets, invites, clientFlags } from "../src/lib/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";

const db = drizzle(sql);

async function deleteUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`\n🔍 Looking for user: ${normalizedEmail}...\n`);

  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    // Find the user in Clerk by email
    const clerkUsers = await clerk.users.getUserList({ emailAddress: [normalizedEmail] });

    if (clerkUsers.data.length === 0) {
      console.error(`❌ No Clerk account found for: ${normalizedEmail}`);
      console.log("   They may have already been deleted from Clerk.");
      console.log("   To clean up orphaned DB records, run: npm run cleanup-users");
      process.exit(1);
    }

    const clerkUser = clerkUsers.data[0];
    console.log(`✓ Found Clerk account: ${clerkUser.id}`);

    // Find the DB record
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUser.id))
      .limit(1);

    if (!dbUser) {
      // No DB record — just delete from Clerk
      console.log("  (No database record found — will only delete from Clerk)");
      await clerk.users.deleteUser(clerkUser.id);
      console.log("\n✅ Deleted from Clerk.");
      process.exit(0);
    }

    console.log(`✓ Found database record: ${dbUser.id} (role: ${dbUser.role})`);

    // Find another admin to reassign notNull FK references to
    const [otherAdmin] = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt), ne(users.id, dbUser.id)))
      .limit(1);

    console.log(`\n→ Handling related records...`);

    // 1. ticket_comments.author_id — notNull, onDelete:set null conflict → delete the comments
    const deletedComments = await db
      .delete(ticketComments)
      .where(eq(ticketComments.authorId, dbUser.id))
      .returning({ id: ticketComments.id });
    if (deletedComments.length > 0) {
      console.log(`  ✓ Deleted ${deletedComments.length} ticket comment(s) authored by this user`);
    }

    // 2. tickets.created_by — notNull, onDelete:set null conflict → reassign if possible
    if (otherAdmin) {
      const reassignedTickets = await db
        .update(tickets)
        .set({ createdBy: otherAdmin.id })
        .where(eq(tickets.createdBy, dbUser.id))
        .returning({ id: tickets.id });
      if (reassignedTickets.length > 0) {
        console.log(`  ✓ Reassigned ${reassignedTickets.length} ticket(s) created by this user to another admin`);
      }
    }

    // 3. invites.invited_by — notNull, onDelete:set null conflict → reassign if possible
    if (otherAdmin) {
      const reassignedInvites = await db
        .update(invites)
        .set({ invitedBy: otherAdmin.id })
        .where(eq(invites.invitedBy, dbUser.id))
        .returning({ id: invites.id });
      if (reassignedInvites.length > 0) {
        console.log(`  ✓ Reassigned ${reassignedInvites.length} invite(s) to another admin`);
      }
    }

    // 4. client_flags.raised_by — notNull, onDelete:set null conflict → reassign if possible
    if (otherAdmin) {
      const reassignedFlags = await db
        .update(clientFlags)
        .set({ raisedBy: otherAdmin.id })
        .where(eq(clientFlags.raisedBy, dbUser.id))
        .returning({ id: clientFlags.id });
      if (reassignedFlags.length > 0) {
        console.log(`  ✓ Reassigned ${reassignedFlags.length} flag(s) to another admin`);
      }
    }

    // 5. Delete the DB user record (userNotifications cascade automatically)
    await db.delete(users).where(eq(users.id, dbUser.id));
    console.log(`  ✓ Deleted database record`);

    // 6. Delete from Clerk
    await clerk.users.deleteUser(clerkUser.id);
    console.log(`  ✓ Deleted Clerk account`);

    console.log(`\n✅ User ${normalizedEmail} has been fully deleted.`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("\nUsage: npm run delete-user <email>");
  console.log("Example: npm run delete-user jack@digitaldirections.com.au");
  process.exit(1);
}

deleteUser(email);
