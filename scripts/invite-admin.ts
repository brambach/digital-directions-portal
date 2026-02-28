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
      subject: "You've been invited to join Digital Directions",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi there,</p>
            <p>The <strong>Digital Directions</strong> team has invited you to join the DD Portal as a team member.</p>
            <p>You'll be able to manage clients, projects, and provide support through our portal.</p>
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Role: <strong>Team Member</strong></p>
              <p style="margin: 0 0 16px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 16px;">Accept Invite &amp; Sign Up</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">This invitation expires in 7 days</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Digital Directions • HR Consulting &amp; Implementation
          </p>
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
