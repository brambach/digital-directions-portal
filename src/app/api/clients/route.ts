import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
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
    const { companyName, contactName, contactEmail, status = "active" } = body;

    // Validate required fields
    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Missing required fields: companyName, contactName, contactEmail" },
        { status: 400 }
      );
    }

    // Create new client
    const newClient = await db
      .insert(clients)
      .values({
        companyName,
        contactName,
        contactEmail,
        status,
      })
      .returning();

    return NextResponse.json(newClient[0], { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
