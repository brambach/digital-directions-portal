import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients, invites, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

// POST - Accept an invite (called after Clerk signup)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find invite
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    // Check if expired
    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    // Check if already accepted
    if (invite.status === "accepted") {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
    }

    // Create or update user in database
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (existingUser) {
      // Check if user already has a different role or clientId (and not default client role)
      const isDifferentRole = existingUser.role !== invite.role;
      const isDifferentClient = existingUser.clientId !== invite.clientId;
      const hasBeenConfigured = existingUser.role !== "client" || existingUser.clientId !== null;

      if ((isDifferentRole || isDifferentClient) && hasBeenConfigured) {
        return NextResponse.json(
          {
            error: "Account conflict: You already have an account with a different role. Please contact support or sign out and create a new account.",
            conflictDetails: {
              currentRole: existingUser.role,
              inviteRole: invite.role,
            }
          },
          { status: 409 }
        );
      }

      // Update user with invite details (handles webhook-created users)
      await db
        .update(users)
        .set({
          role: invite.role,
          clientId: invite.clientId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));
    } else {
      // Create new user - use try/catch for race condition with webhook
      try {
        await db.insert(users).values({
          clerkId: userId,
          role: invite.role,
          clientId: invite.clientId,
          agencyId: null,
        });
      } catch (insertError: any) {
        // Handle duplicate key error from webhook race condition
        // Check both insertError.code and insertError.cause.code (Drizzle wraps Postgres errors)
        const errorCode = insertError?.code || insertError?.cause?.code;

        if (errorCode === "23505") {
          console.log("User already exists (created by webhook), updating instead...");
          // Fetch the user that was just created
          const [webhookUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, userId))
            .limit(1);

          if (webhookUser) {
            // Update with invite details
            await db
              .update(users)
              .set({
                role: invite.role,
                clientId: invite.clientId,
                updatedAt: new Date(),
              })
              .where(eq(users.id, webhookUser.id));
          }
        } else {
          // Re-throw other errors
          throw insertError;
        }
      }
    }

    // Update Clerk metadata
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        role: invite.role,
      },
    });

    // Mark invite as accepted
    await db
      .update(invites)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(invites.id, invite.id));

    // Send notification for client invites
    if (invite.clientId) {
      const clerkUser = await clerk.users.getUser(userId);
      const userName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "New User";

      const [client] = await db
        .select({ companyName: clients.companyName })
        .from(clients)
        .where(eq(clients.id, invite.clientId))
        .limit(1);

      notifyEvent({
        event: "user_accepted_invite",
        clientId: invite.clientId,
        clientName: client?.companyName || "Unknown Client",
        userName,
      });
    }

    return NextResponse.json({
      success: true,
      role: invite.role,
      message: "Invite accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
