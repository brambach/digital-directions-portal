import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discoveryTemplates } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull, desc } from "drizzle-orm";

// GET /api/discovery-templates - List all active templates
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const payrollSystem = searchParams.get("payrollSystem");

    const conditions = [isNull(discoveryTemplates.deletedAt)];

    if (payrollSystem) {
      conditions.push(
        eq(
          discoveryTemplates.payrollSystem,
          payrollSystem as "keypay" | "myob" | "deputy" | "generic"
        )
      );
    }

    const templates = await db
      .select()
      .from(discoveryTemplates)
      .where(and(...conditions))
      .orderBy(desc(discoveryTemplates.createdAt));

    // Parse sections JSON for each template and add question count
    const result = templates.map((t) => {
      const sections = JSON.parse(t.sections || "[]");
      const questionCount = sections.reduce(
        (acc: number, s: { questions?: unknown[] }) =>
          acc + (s.questions?.length || 0),
        0
      );
      return { ...t, sections, questionCount };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error fetching discovery templates:", message);

    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/discovery-templates - Create template
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, payrollSystem, sections } = body;

    if (!name || !payrollSystem || !sections) {
      return NextResponse.json(
        { error: "Missing required fields: name, payrollSystem, sections" },
        { status: 400 }
      );
    }

    const validSystems = ["keypay", "myob", "deputy", "generic"];
    if (!validSystems.includes(payrollSystem)) {
      return NextResponse.json(
        { error: "Invalid payroll system" },
        { status: 400 }
      );
    }

    const [template] = await db
      .insert(discoveryTemplates)
      .values({
        name,
        payrollSystem,
        sections: JSON.stringify(sections),
      })
      .returning();

    return NextResponse.json(
      { ...template, sections: JSON.parse(template.sections) },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating discovery template:", message);

    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
