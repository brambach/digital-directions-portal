import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { invites, users, clients } from "@/lib/db/schema";
import { eq, and, isNull, desc, gt } from "drizzle-orm";
import { sendInviteEmail } from "@/lib/email";
import { randomBytes } from "crypto";

// GET - List invites (admin only)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from DB
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all pending invites
    const pendingInvites = await db
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        status: invites.status,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
        clientName: clients.companyName,
      })
      .from(invites)
      .leftJoin(clients, eq(invites.clientId, clients.id))
      .where(eq(invites.status, "pending"))
      .orderBy(desc(invites.createdAt));

    return NextResponse.json({ invites: pendingInvites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new invite (admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from DB
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, role, clientId } = body;

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, role" },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== "admin" && role !== "client") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // If role is client, clientId is required
    if (role === "client" && !clientId) {
      return NextResponse.json(
        { error: "clientId is required for client invites" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.email, email.toLowerCase()),
          eq(invites.status, "pending"),
          gt(invites.expiresAt, new Date())
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (existingInvite) {
      return NextResponse.json(
        { error: "An active invite already exists for this email" },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Get client name if applicable (needed for email)
    let clientName: string | undefined;
    if (clientId) {
      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1)
        .then((rows) => rows[0]);
      clientName = client?.companyName;
    }

    // Try to send email FIRST before creating database record
    const emailResult = await sendInviteEmail({
      to: email,
      token,
      role,
      inviterName: user.role === "admin" ? "Digital Directions Team" : "Team Member",
      clientName,
    });

    // If email failed, don't create the invite
    if (!emailResult.success) {
      console.error("Failed to send invite email:", emailResult.error);
      return NextResponse.json(
        {
          error: `Failed to send invite email: ${emailResult.error}`,
        },
        { status: 400 }
      );
    }

    // Email sent successfully, now create the invite record
    const [newInvite] = await db
      .insert(invites)
      .values({
        email: email.toLowerCase(),
        token,
        role,
        clientId: clientId || null,
        invitedBy: user.id,
        expiresAt,
        status: "pending",
      })
      .returning();

    return NextResponse.json(
      {
        message: "Invite sent successfully",
        invite: {
          id: newInvite.id,
          email: newInvite.email,
          role: newInvite.role,
          expiresAt: newInvite.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
