import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { helpArticles, users } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    const [article] = await db
      .select()
      .from(helpArticles)
      .where(and(eq(helpArticles.slug, slug), isNull(helpArticles.deletedAt)))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching help article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { slug } = await params;
    const body = await req.json();
    const { title, content, category, loomUrl, published } = body;

    const [existing] = await db
      .select()
      .from(helpArticles)
      .where(and(eq(helpArticles.slug, slug), isNull(helpArticles.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // If title changed, update slug
    let newSlug = existing.slug;
    if (title && title !== existing.title) {
      newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const slugConflict = await db
        .select({ id: helpArticles.id })
        .from(helpArticles)
        .where(and(eq(helpArticles.slug, newSlug), isNull(helpArticles.deletedAt)))
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== existing.id) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (title !== undefined) updateData.slug = newSlug;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category || null;
    if (loomUrl !== undefined) updateData.loomUrl = loomUrl || null;
    if (published !== undefined) {
      updateData.publishedAt = published ? (existing.publishedAt || new Date()) : null;
    }

    const [updated] = await db
      .update(helpArticles)
      .set(updateData)
      .where(eq(helpArticles.id, existing.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating help article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { slug } = await params;

    const [existing] = await db
      .select()
      .from(helpArticles)
      .where(and(eq(helpArticles.slug, slug), isNull(helpArticles.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Soft delete
    await db
      .update(helpArticles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(helpArticles.id, existing.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting help article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
