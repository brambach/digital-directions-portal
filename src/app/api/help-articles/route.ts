import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { helpArticles, users } from "@/lib/db/schema";
import { eq, isNull, isNotNull, and, ilike, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const published = searchParams.get("published");

    const conditions = [isNull(helpArticles.deletedAt)];

    if (category) {
      conditions.push(eq(helpArticles.category, category));
    }

    // Clients only see published articles
    if (user.role === "client" || published === "true") {
      conditions.push(isNotNull(helpArticles.publishedAt));
    }

    if (search) {
      conditions.push(ilike(helpArticles.title, `%${search}%`));
    }

    const articles = await db
      .select()
      .from(helpArticles)
      .where(and(...conditions))
      .orderBy(desc(helpArticles.createdAt));

    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error fetching help articles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { title, content, category, loomUrl, published } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: title, content" },
        { status: 400 }
      );
    }

    // Auto-generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for slug uniqueness
    const existing = await db
      .select({ id: helpArticles.id })
      .from(helpArticles)
      .where(eq(helpArticles.slug, slug))
      .limit(1);

    const finalSlug = existing.length > 0 ? `${slug}-${Date.now()}` : slug;

    const [article] = await db
      .insert(helpArticles)
      .values({
        title,
        slug: finalSlug,
        content,
        category: category || null,
        loomUrl: loomUrl || null,
        publishedAt: published ? new Date() : null,
      })
      .returning();

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Error creating help article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
