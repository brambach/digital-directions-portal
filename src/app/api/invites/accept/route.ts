import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { invites, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
      // Check if user already has a different role or clientId
      if (existingUser.role !== invite.role || existingUser.clientId !== invite.clientId) {
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

      // If role and clientId match, just mark invite as accepted (idempotent)
      await db
        .update(invites)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
        })
        .where(eq(invites.id, invite.id));

      return NextResponse.json({
        success: true,
        role: invite.role,
        message: "Invite already accepted",
      });
    } else {
      // Create new user
      await db.insert(users).values({
        clerkId: userId,
        role: invite.role,
        clientId: invite.clientId,
        agencyId: null,
      });
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
