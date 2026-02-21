import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bobConfigChecklist, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendBobConfigEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// Placeholder bob config items (content TBD — Bryce to provide real content)
const DEFAULT_BOB_CONFIG_ITEMS = [
  {
    id: "placeholder-1",
    title: "Organisation Units (Departments)",
    description:
      "Ensure your departments and org structure in HiBob matches how your payroll system categorises employees. This is critical for correct payroll allocation.",
    loomUrl: null,
    faqItems: [
      {
        question: "What if my departments don't match my payroll categories?",
        answer:
          "Work with your DD Integration Specialist to create a mapping between HiBob departments and your payroll categories. This will be set up during the Data Mapping stage.",
      },
    ],
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Leave Types",
    description:
      "Review and confirm all leave types are configured in HiBob (e.g. Annual Leave, Sick Leave, Long Service Leave). Ensure the names and accrual rules are correct before integration.",
    loomUrl: null,
    faqItems: [
      {
        question: "How many leave types do we need?",
        answer:
          "Set up all leave types your employees use. Unused leave types can be hidden from employees but should still exist in the system for accurate record-keeping.",
      },
    ],
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Employee Profiles & Fields",
    description:
      "Verify that all required employee fields are populated in HiBob: employment type, work location, pay rate type (salaried/hourly), and start date. These fields are used to populate your payroll system.",
    loomUrl: null,
    faqItems: [
      {
        question: "What if some employee profiles are incomplete?",
        answer:
          "Incomplete profiles will cause errors during the initial sync. Please ensure all active employees have their required fields filled in before we begin testing.",
      },
    ],
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Pay Groups & Pay Calendars",
    description:
      "Confirm your pay groups and pay calendars are set up correctly in HiBob. Each employee should be assigned to the correct pay group (weekly, fortnightly, monthly) that matches their payroll schedule.",
    loomUrl: null,
    faqItems: [
      {
        question: "What is a pay calendar?",
        answer:
          "A pay calendar defines when employees get paid (e.g. every fortnight on a Friday). HiBob uses this to track time and attendance periods, and it must match your payroll system's pay schedule.",
      },
    ],
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Work Locations",
    description:
      "Ensure all work locations (offices, sites, remote) are configured in HiBob and assigned to the correct employees. Locations are often used to determine applicable awards, tax rules, or cost centres in your payroll system.",
    loomUrl: null,
    faqItems: [
      {
        question: "Do remote employees need a work location?",
        answer:
          "Yes — even remote employees should have a designated work location (usually their home state/country) for payroll tax and award determination purposes.",
      },
    ],
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Custom Fields Review",
    description:
      "Review any custom fields configured in HiBob that your DD Integration Specialist has flagged as relevant to the integration (e.g. employee ID, cost centre, award code). Ensure these are populated for all active employees.",
    loomUrl: null,
    faqItems: [
      {
        question: "Which custom fields are required?",
        answer:
          "Your DD Integration Specialist will advise which custom fields are needed based on your specific payroll system and configuration. These will have been discussed during the Discovery stage.",
      },
    ],
    completedAt: null,
  },
];

// GET /api/projects/[id]/bob-config — Get the bob config checklist for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [checklist] = await db
      .select()
      .from(bobConfigChecklist)
      .where(eq(bobConfigChecklist.projectId, projectId))
      .limit(1);

    if (!checklist) {
      return NextResponse.json({ checklist: null });
    }

    return NextResponse.json({
      checklist: {
        ...checklist,
        items: JSON.parse(checklist.items || "[]"),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/bob-config — Admin initializes bob config checklist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(bobConfigChecklist)
      .where(eq(bobConfigChecklist.projectId, projectId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Bob Config checklist already initialized for this project" },
        { status: 409 }
      );
    }

    // Generate fresh IDs for the default items
    const itemsWithIds = DEFAULT_BOB_CONFIG_ITEMS.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    const [checklist] = await db
      .insert(bobConfigChecklist)
      .values({
        projectId,
        items: JSON.stringify(itemsWithIds),
        status: "active",
      })
      .returning();

    // Notify client users
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, project.clientId), isNull(users.deletedAt)));

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "bob_config",
        title: "HiBob configuration checklist ready",
        message: `Your HiBob configuration checklist for "${project.name}" is ready. Please work through each item and mark them complete.`,
        linkUrl: `/dashboard/client/projects/${projectId}/bob-config`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
        if (email) {
          await sendBobConfigEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "submitted",
          });
        }
      } catch (emailErr) {
        console.error("Error sending bob config init email:", emailErr);
      }
    }

    return NextResponse.json(
      { checklist: { ...checklist, items: JSON.parse(checklist.items) } },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
