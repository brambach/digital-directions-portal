import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import { invites } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const db = drizzle(sql);

async function removeInvite() {
  const emails = [
    "bryce@brycedigital.io",
    "bryce@digitaldirections.io",
    "bryce.rambach@gmail.com"
  ];

  console.log(`🔍 Looking for invites for ${emails.length} email addresses...`);

  let totalDeleted = 0;

  try {
    for (const email of emails) {
      console.log(`\n📧 Processing ${email}...`);

      // Find invites for this email
      const existingInvites = await db
        .select()
        .from(invites)
        .where(eq(invites.email, email));

      if (existingInvites.length === 0) {
        console.log(`  ✓ No invites found`);
        continue;
      }

      console.log(`  Found ${existingInvites.length} invite(s):`);
      existingInvites.forEach((invite) => {
        console.log(`    - ID: ${invite.id}, Status: ${invite.status}, Created: ${invite.createdAt}`);
      });

      // Delete all invites for this email
      const deleted = await db
        .delete(invites)
        .where(eq(invites.email, email))
        .returning();

      console.log(`  ✅ Removed ${deleted.length} invite(s)`);
      totalDeleted += deleted.length;
    }

    console.log(`\n🎉 Total removed: ${totalDeleted} invite(s) across ${emails.length} email addresses`);
    console.log("You can now send fresh invites to these email addresses.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

removeInvite();
