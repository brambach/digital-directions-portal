/**
 * Invite a new admin to the Digital Directions Portal
 *
 * Creates an invite in the database and sends an invite email.
 * The invitee will receive a link to sign up and will be automatically
 * set as an admin on completion.
 *
 * Usage:
 * npm run invite-admin <email>
 *
 * Example:
 * npm run invite-admin jack@digitaldirections.com.au
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import { users, invites } from "../src/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { Resend } from "resend";

const db = drizzle(sql);

async function inviteAdmin(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`\n📧 Sending admin invite to: ${normalizedEmail}...\n`);

  try {
    // Find an admin user to set as invitedBy (required field)
    const [adminUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)))
      .limit(1);

    if (!adminUser) {
      console.error("❌ No admin user found in the database to send invite from.");
      process.exit(1);
    }

    // Check for an existing pending invite for this email
    const [existingInvite] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.email, normalizedEmail),
          eq(invites.status, "pending"),
          gt(invites.expiresAt, new Date())
        )
      )
      .limit(1);

    if (existingInvite) {
      console.error(`❌ A pending invite already exists for ${normalizedEmail}.`);
      console.log(`   Expires: ${existingInvite.expiresAt.toLocaleDateString()}`);
      console.log("\nIf you need to resend, delete the existing invite first.");
      process.exit(1);
    }

    // Generate secure token and expiry
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Send invite email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY is not set. Cannot send invite email.");
      process.exit(1);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;
    const emailFrom = process.env.EMAIL_FROM || "Digital Directions <notifications@digitaldirections.com>";

    const resend = new Resend(resendApiKey);
    const emailResult = await resend.emails.send({
      from: emailFrom,
      to: normalizedEmail,
      subject: "You've been invited to Digital Directions Portal",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f5f9; margin: 0; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0;">
            <img src="${appUrl}/images/logos/long_form_purple_text.png" alt="Digital Directions" style="height: 40px; margin-bottom: 24px;" />
            <h1 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 8px;">You're invited to join the team!</h1>
            <p style="color: #64748b; margin: 0 0 24px;">The Digital Directions team has invited you to access the DD Portal as a team member.</p>
            <a href="${inviteUrl}" style="display: inline-block; background: #7C1CFF; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
              Accept Invitation
            </a>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">This invite expires in 7 days. If you didn't expect this email, you can ignore it.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResult.error) {
      console.error("❌ Failed to send invite email:", emailResult.error);
      process.exit(1);
    }

    // Email sent — create the invite record
    const [newInvite] = await db
      .insert(invites)
      .values({
        email: normalizedEmail,
        token,
        role: "admin",
        clientId: null,
        invitedBy: adminUser.id,
        expiresAt,
        status: "pending",
      })
      .returning();

    console.log("✅ Invite email sent successfully!");
    console.log(`✅ Invite record created (expires ${expiresAt.toLocaleDateString()})`);
    console.log(`\n🔗 Invite URL (for testing): ${inviteUrl}`);
    console.log(`\n📋 What happens next:`);
    console.log(`   1. ${normalizedEmail} receives an email with a sign-up link`);
    console.log(`   2. They click the link and create their account`);
    console.log(`   3. They're automatically set as an admin and redirected to the dashboard`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("\nUsage: npm run invite-admin <email>");
  console.log("Example: npm run invite-admin jack@digitaldirections.com.au");
  process.exit(1);
}

inviteAdmin(email);
