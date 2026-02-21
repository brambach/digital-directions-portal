import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningSteps, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { eq, and, isNull, asc } from "drizzle-orm";
import { sendProvisioningEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// Content for each provisioning step (based on payroll system)
const PROVISIONING_STEP_CONTENT = {
  hibob: {
    title: "HiBob",
    orderIndex: 1,
    description: JSON.stringify({
      intro:
        "Your Digital Directions Integration Specialist will require administrative access to your HiBob Production environment. Once granted, they can access your Sandbox environment. This process should take 10–15 minutes.",
      steps: [
        "Login to your HiBob Production environment.",
        'Navigate to Org → People, then click New Hire to open the "Add new hire to Bob" popup.',
        'Choose your onboarding template. Enter the following details carefully:\n  • Email: firstname+yourclientdomain@digitaldirections.io (use .io — not .com)\n  • First name / Last name: as provided by your DD Integration Specialist\n  • Start date: Set in the past so the account is accessible immediately\n  • Ensure "Invite employee" is turned on before completing',
        "Click the grid icon (top left) → System Settings → expand Account → select Permission Groups → click the Admin row.",
        "Under Admins, open Group actions → Edit details → click Edit under Members.",
        "Search for the employee you just created, click their row to add them to Selected, then click Select → Save → Confirm.",
      ],
      revokeNote:
        "Navigate to Org → People, find the specialist, click Actions → Manage access → Delete employee profile, type DELETE to confirm.",
    }),
  },
  keypay: {
    title: "Employment Hero Payroll (KeyPay)",
    orderIndex: 2,
    description: JSON.stringify({
      intro:
        "Your Digital Directions Integration Specialist will require administrative access to your Employment Hero (KeyPay) environment. This process should take approximately 5 minutes.",
      steps: [
        "Login to your KeyPay environment.",
        "Hover over the briefcase icon in the left navigation → select Payroll Settings.",
        "In Business Settings, select Manage Users → click the green + Add button.",
        "Enter the Integration Specialist's details and assign Admin permissions, then save.",
        "Navigate back to Business Settings → Manage Users to confirm the user appears. Notify your DD Integration Specialist that they have been added — they will reset their password and complete access on their end.",
      ],
      revokeNote:
        "Go to Business Settings → Manage Users, click the red trash icon next to the specialist's name.",
    }),
  },
  workato: {
    title: "Workato",
    orderIndex: 3,
    description: JSON.stringify({
      intro:
        "Your Digital Directions Integration Specialist will require administrative access to your Workato environment across all environments (Development, Testing, Production).",
      steps: [
        "Login to Workato using your workato@yourcompanydomain admin account (e.g. if your email is jon@acmecorp.com, use workato@acmecorp.com).",
        "Hover over the left side of the screen to reveal navigation → click Workspace admin.",
        "On the Workspace admin page, click + Invite collaborator.",
        "Fill in the collaborator details:\n  • Full name: as provided by your DD Integration Specialist\n  • Email: firstname+yourclientdomain@digitaldirections.io (use .io — not .com)\n  • Roles: Grant Admin access to all three environments — Development, Test, and Production\n  • Click Send invitation",
        "Confirm the invitation appears in the Pending invitations section with all three environments listed. Notify your DD Integration Specialist.",
      ],
      revokeNote:
        "Go to Workspace admin → Collaborators, click the specialist's name, then click the trash icon.",
    }),
  },
};

// GET /api/projects/[id]/provisioning — Get all provisioning steps for a project
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

    const steps = await db
      .select()
      .from(provisioningSteps)
      .where(eq(provisioningSteps.projectId, projectId))
      .orderBy(asc(provisioningSteps.orderIndex));

    return NextResponse.json({ steps });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/provisioning — Admin initializes provisioning steps
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

    // Check if steps already exist
    const existing = await db
      .select()
      .from(provisioningSteps)
      .where(eq(provisioningSteps.projectId, projectId));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Provisioning steps already initialized for this project" },
        { status: 409 }
      );
    }

    // Determine which payroll step to use based on project.payrollSystem
    // Default to keypay for MVP
    const payrollSystem = project.payrollSystem || "keypay";
    const payrollStepKey = payrollSystem === "keypay" ? "keypay" : "keypay";

    // Create the 3 standard steps: hibob, [payroll], workato
    const stepsToCreate = [
      {
        projectId,
        stepKey: "hibob",
        ...PROVISIONING_STEP_CONTENT.hibob,
      },
      {
        projectId,
        stepKey: payrollStepKey,
        ...PROVISIONING_STEP_CONTENT[payrollStepKey as keyof typeof PROVISIONING_STEP_CONTENT],
      },
      {
        projectId,
        stepKey: "workato",
        ...PROVISIONING_STEP_CONTENT.workato,
      },
    ];

    const createdSteps = await db
      .insert(provisioningSteps)
      .values(stepsToCreate)
      .returning();

    // Notify client users
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, project.clientId), isNull(users.deletedAt)));

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "provisioning",
        title: "System provisioning ready",
        message: `Your provisioning checklist for "${project.name}" is ready. Please complete each step and mark it done.`,
        linkUrl: `/dashboard/client/projects/${projectId}/provisioning`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
        if (email) {
          await sendProvisioningEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "step_completed",
            stepTitle: "all steps",
          });
        }
      } catch (emailErr) {
        console.error("Error sending provisioning init email:", emailErr);
      }
    }

    return NextResponse.json({ steps: createdSteps }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
