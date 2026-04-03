# Client Submission Withdrawal & Undo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let clients self-serve withdraw submitted-for-review sections and undo provisioning step completions.

**Architecture:** 4 new `/withdraw` API routes (one per submittable section), 1 new `/uncomplete` route for provisioning steps, 1 shared confirmation dialog component, UI updates to 5 client components, and email function updates for the new events. No DB migration.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Clerk auth, Resend email, Shadcn UI, Tailwind CSS

---

### Task 1: Create WithdrawSubmissionDialog Component

**Files:**
- Create: `src/components/withdraw-submission-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// src/components/withdraw-submission-dialog.tsx
"use client";

import { Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WithdrawSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  stageName: string;
}

export function WithdrawSubmissionDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  stageName,
}: WithdrawSubmissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Submission</DialogTitle>
          <DialogDescription>
            This will withdraw your {stageName} submission and return it to draft
            mode. You can make changes and resubmit when ready.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Withdrawing...
              </>
            ) : (
              <>
                <Undo2 className="w-4 h-4 mr-2" />
                Withdraw Submission
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `withdraw-submission-dialog.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/withdraw-submission-dialog.tsx
git commit -m "feat: add WithdrawSubmissionDialog shared component"
```

---

### Task 2: Add "withdrawn" Event to Email Functions

**Files:**
- Modify: `src/lib/email.ts`

This task adds the `"withdrawn"` event to `sendDiscoveryEmail`, `sendMappingEmail`, `sendBobConfigEmail`, `sendUatEmail`, and the `"step_uncompleted"` event to `sendProvisioningEmail`. All 5 changes are in the same file.

- [ ] **Step 1: Add `"withdrawn"` event to `sendDiscoveryEmail`**

In `src/lib/email.ts`, find the `sendDiscoveryEmail` function signature (line ~253):

```typescript
event: "ready" | "submitted" | "approved" | "changes_requested";
```

Change to:

```typescript
event: "ready" | "submitted" | "approved" | "changes_requested" | "withdrawn";
```

Then inside the `eventConfig` object (after the `changes_requested` entry, before the closing `}`), add:

```typescript
    withdrawn: {
      subject: `Discovery submission withdrawn: ${params.projectName}`,
      heading: "Discovery Submission Withdrawn",
      gradientColors: "#6B7280 0%, #4B5563 100%",
      body: `<p>The discovery questionnaire submission for <strong>${params.projectName}</strong> has been withdrawn by the client. They may resubmit after making changes.</p>
        <p>No action needed on your end.</p>`,
      ctaText: "View Project",
      ctaUrl: `${APP_URL}/dashboard/admin/projects/${params.projectId}/discovery`,
      ctaColor: "#6B7280",
    },
```

- [ ] **Step 2: Add `"withdrawn"` event to `sendMappingEmail`**

Find the `sendMappingEmail` function signature (line ~528):

```typescript
event: "ready" | "submitted" | "approved" | "changes_requested" | "exported";
```

Change to:

```typescript
event: "ready" | "submitted" | "approved" | "changes_requested" | "exported" | "withdrawn";
```

Then inside the `eventConfig` object (after `exported`, before the closing `}`), add:

```typescript
    withdrawn: {
      subject: `Data mapping submission withdrawn: ${params.projectName}`,
      heading: "Data Mapping Submission Withdrawn",
      gradientColors: "#6B7280 0%, #4B5563 100%",
      body: `<p>The data mapping submission for <strong>${params.projectName}</strong> has been withdrawn by the client. They may resubmit after making changes.</p>
        <p>No action needed on your end.</p>`,
      ctaText: "View Project",
      ctaUrl: `${APP_URL}/dashboard/admin/projects/${params.projectId}/mapping`,
      ctaColor: "#6B7280",
    },
```

- [ ] **Step 3: Add `"withdrawn"` event to `sendBobConfigEmail`**

Find the `sendBobConfigEmail` function signature (line ~644):

```typescript
event: "submitted" | "approved" | "changes_requested";
```

Change to:

```typescript
event: "submitted" | "approved" | "changes_requested" | "withdrawn";
```

Then inside the `eventConfig` object (after `changes_requested`, before the closing `}`), add:

```typescript
    withdrawn: {
      subject: `HiBob config submission withdrawn: ${params.projectName}`,
      heading: "HiBob Config Submission Withdrawn",
      gradientColors: "#6B7280 0%, #4B5563 100%",
      body: `<p>The HiBob configuration checklist submission for <strong>${params.projectName}</strong> has been withdrawn by the client. They may resubmit after making changes.</p>
        <p>No action needed on your end.</p>`,
      ctaText: "View Project",
      ctaUrl: `${APP_URL}/dashboard/admin/projects/${params.projectId}/bob-config`,
      ctaColor: "#6B7280",
    },
```

- [ ] **Step 4: Add `"withdrawn"` event to `sendUatEmail`**

Find the `sendUatEmail` function signature (line ~983):

```typescript
event: "published" | "submitted" | "approved" | "changes_requested";
```

Change to:

```typescript
event: "published" | "submitted" | "approved" | "changes_requested" | "withdrawn";
```

Then inside the `eventConfig` object (after `changes_requested`, before the closing `}`), add:

```typescript
    withdrawn: {
      subject: `UAT results withdrawn: ${params.projectName}`,
      heading: "UAT Results Withdrawn",
      gradientColors: "#6B7280 0%, #4B5563 100%",
      body: `<p>The UAT results submission for <strong>${params.projectName}</strong> has been withdrawn by the client. They may resubmit after making changes.</p>
        <p>No action needed on your end.</p>`,
      ctaText: "View Project",
      ctaUrl: `${APP_URL}/dashboard/admin/projects/${params.projectId}/uat`,
      ctaColor: "#6B7280",
    },
```

- [ ] **Step 5: Add `"step_uncompleted"` event to `sendProvisioningEmail`**

Find the `sendProvisioningEmail` function signature (line ~443):

```typescript
event: "step_completed" | "all_verified";
```

Change to:

```typescript
event: "step_completed" | "all_verified" | "step_uncompleted";
```

Then inside the `eventConfig` object (after `all_verified`, before the closing `}`), add:

```typescript
    step_uncompleted: {
      subject: `Provisioning step reverted: ${params.projectName}`,
      heading: "Provisioning Step Reverted",
      gradientColors: "#6B7280 0%, #4B5563 100%",
      body: `<p>A provisioning step${params.stepTitle ? ` (<strong>${params.stepTitle}</strong>)` : ""} for <strong>${params.projectName}</strong> has been reverted by the client. They may re-mark it as complete when ready.</p>
        <p>No action needed on your end.</p>`,
      ctaText: "View Provisioning",
      ctaUrl: `${APP_URL}/dashboard/admin/projects/${params.projectId}/provisioning`,
      ctaColor: "#6B7280",
    },
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `email.ts`

- [ ] **Step 7: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add withdrawn/uncompleted email events for submission withdrawal"
```

---

### Task 3: Create Discovery Withdraw API Route

**Files:**
- Create: `src/app/api/projects/[id]/discovery/withdraw/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/projects/[id]/discovery/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  discoveryResponses,
  projects,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendDiscoveryEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/discovery/withdraw — Client withdraws submitted questionnaire
export async function POST(
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

    const [existing] = await db
      .select()
      .from(discoveryResponses)
      .where(eq(discoveryResponses.projectId, projectId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "No discovery response found" },
        { status: 404 }
      );
    }

    if (existing.status !== "in_review") {
      return NextResponse.json(
        { error: "Discovery is not in a withdrawable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(discoveryResponses)
      .set({
        status: "active",
        submittedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(discoveryResponses.id, existing.id))
      .returning();

    // Notify all admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const admin of adminUsers) {
      await db.insert(userNotifications).values({
        userId: admin.id,
        type: "discovery",
        title: "Discovery submission withdrawn",
        message: `The discovery questionnaire submission for "${project.name}" has been withdrawn by the client. They may resubmit after making changes.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/discovery`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(admin.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "there";
        if (email) {
          await sendDiscoveryEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "withdrawn",
          });
        }
      } catch (emailErr) {
        console.error("Error sending discovery withdrawal email:", emailErr);
      }
    }

    return NextResponse.json({
      ...updated,
      responses: JSON.parse(updated.responses),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/\[id\]/discovery/withdraw/route.ts
git commit -m "feat: add discovery withdraw API route"
```

---

### Task 4: Create Mapping Withdraw API Route

**Files:**
- Create: `src/app/api/projects/[id]/mapping/withdraw/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/projects/[id]/mapping/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dataMappingConfigs,
  projects,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendMappingEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/mapping/withdraw — Client withdraws submitted mappings
export async function POST(
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

    const [config] = await db
      .select()
      .from(dataMappingConfigs)
      .where(eq(dataMappingConfigs.projectId, projectId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        { error: "No mapping config found" },
        { status: 404 }
      );
    }

    if (config.status !== "in_review") {
      return NextResponse.json(
        { error: "Mapping is not in a withdrawable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(dataMappingConfigs)
      .set({
        status: "active",
        submittedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(dataMappingConfigs.id, config.id))
      .returning();

    // Notify all admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const admin of adminUsers) {
      await db.insert(userNotifications).values({
        userId: admin.id,
        type: "mapping",
        title: "Data mapping submission withdrawn",
        message: `The data mapping submission for "${project.name}" has been withdrawn by the client. They may resubmit after making changes.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/mapping`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(admin.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "there";
        if (email) {
          await sendMappingEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "withdrawn",
          });
        }
      } catch (emailErr) {
        console.error("Error sending mapping withdrawal email:", emailErr);
      }
    }

    return NextResponse.json({
      ...updated,
      hibobValues: updated.hibobValues ? JSON.parse(updated.hibobValues) : {},
      payrollValues: updated.payrollValues ? JSON.parse(updated.payrollValues) : {},
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error withdrawing mapping:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/\[id\]/mapping/withdraw/route.ts
git commit -m "feat: add mapping withdraw API route"
```

---

### Task 5: Create Bob Config Withdraw API Route

**Files:**
- Create: `src/app/api/projects/[id]/bob-config/withdraw/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/projects/[id]/bob-config/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bobConfigChecklist, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendBobConfigEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/bob-config/withdraw — Client withdraws submitted checklist
export async function POST(
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
      return NextResponse.json({ error: "Bob Config checklist not found" }, { status: 404 });
    }

    if (checklist.status !== "in_review") {
      return NextResponse.json(
        { error: "Checklist is not in a withdrawable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(bobConfigChecklist)
      .set({
        status: "active",
        submittedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(bobConfigChecklist.id, checklist.id))
      .returning();

    // Notify all admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const admin of adminUsers) {
      await db.insert(userNotifications).values({
        userId: admin.id,
        type: "bob_config",
        title: "HiBob config submission withdrawn",
        message: `The HiBob configuration checklist for "${project.name}" has been withdrawn by the client. They may resubmit after making changes.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/bob-config`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(admin.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
        if (email) {
          await sendBobConfigEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "withdrawn",
          });
        }
      } catch (emailErr) {
        console.error("Error sending bob config withdrawal email:", emailErr);
      }
    }

    return NextResponse.json({
      checklist: { ...updated, items: JSON.parse(updated.items) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/\[id\]/bob-config/withdraw/route.ts
git commit -m "feat: add bob-config withdraw API route"
```

---

### Task 6: Create UAT Withdraw API Route

**Files:**
- Create: `src/app/api/projects/[id]/uat/withdraw/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/projects/[id]/uat/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uatResults, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendUatEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/uat/withdraw — Client withdraws submitted UAT results
export async function POST(
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

    const [result] = await db
      .select()
      .from(uatResults)
      .where(eq(uatResults.projectId, projectId))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: "No UAT results found" },
        { status: 404 }
      );
    }

    if (result.status !== "in_review") {
      return NextResponse.json(
        { error: "UAT results are not in a withdrawable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(uatResults)
      .set({
        status: "active",
        submittedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(uatResults.id, result.id))
      .returning();

    // Notify all admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    for (const adminUser of adminUsers) {
      await db.insert(userNotifications).values({
        userId: adminUser.id,
        type: "uat_submitted",
        title: "UAT results withdrawn",
        message: `The UAT results for "${project.name}" have been withdrawn by the client. They may resubmit after making changes.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/uat`,
      });

      try {
        const clerkAdmin = await clerk.users.getUser(adminUser.clerkId);
        const email = clerkAdmin.emailAddresses[0]?.emailAddress;
        const name = `${clerkAdmin.firstName || ""}`.trim() || "Team";
        if (email) {
          await sendUatEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "withdrawn",
          });
        }
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/\[id\]/uat/withdraw/route.ts
git commit -m "feat: add UAT withdraw API route"
```

---

### Task 7: Create Provisioning Uncomplete API Route

**Files:**
- Create: `src/app/api/projects/[id]/provisioning/[stepId]/uncomplete/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/projects/[id]/provisioning/[stepId]/uncomplete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningSteps, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendProvisioningEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/provisioning/[stepId]/uncomplete — Client undoes step completion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId, stepId } = await params;

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

    const [step] = await db
      .select()
      .from(provisioningSteps)
      .where(
        and(
          eq(provisioningSteps.id, stepId),
          eq(provisioningSteps.projectId, projectId)
        )
      )
      .limit(1);

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    if (!step.completedAt) {
      return NextResponse.json(
        { error: "Step has not been completed yet" },
        { status: 400 }
      );
    }

    if (step.verifiedAt) {
      return NextResponse.json(
        { error: "Step has already been verified and cannot be undone" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(provisioningSteps)
      .set({
        completedAt: null,
        completedBy: null,
      })
      .where(eq(provisioningSteps.id, stepId))
      .returning();

    // Notify admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const adminUser of adminUsers) {
      await db.insert(userNotifications).values({
        userId: adminUser.id,
        type: "provisioning",
        title: `Provisioning step reverted: ${step.title}`,
        message: `The "${step.title}" provisioning step for "${project.name}" has been reverted by the client.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/provisioning`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(adminUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
        if (email) {
          await sendProvisioningEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "step_uncompleted",
            stepTitle: step.title,
          });
        }
      } catch (emailErr) {
        console.error("Error sending provisioning uncomplete email:", emailErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/\[id\]/provisioning/\[stepId\]/uncomplete/route.ts
git commit -m "feat: add provisioning step uncomplete API route"
```

---

### Task 8: Add Withdraw Button to Discovery Client Component

**Files:**
- Modify: `src/components/client-discovery-content.tsx`

The `ReadOnlyView` function component (defined inside this file at line ~546) needs new props and a withdraw button in the review banner. The parent component that renders `ReadOnlyView` (at line ~232) needs state for the dialog.

- [ ] **Step 1: Add imports to the top of the file**

At the top of `src/components/client-discovery-content.tsx`, add `Undo2` to the lucide-react import and import the dialog:

Add `Undo2` to the existing lucide-react import (alongside `Check`, `ChevronLeft`, etc.):

```typescript
import { ..., Undo2 } from "lucide-react";
```

Add a new import for the dialog component:

```typescript
import { WithdrawSubmissionDialog } from "@/components/withdraw-submission-dialog";
```

- [ ] **Step 2: Update the ReadOnlyView function signature to accept new props**

Find the `ReadOnlyView` function (line ~546):

```typescript
function ReadOnlyView({
  template,
  answers,
  bannerType,
  reviewNotes,
}: {
  template: Template | null;
  answers: Record<string, string | boolean>;
  bannerType: "review" | "approved";
  reviewNotes?: string | null;
}) {
```

Change to:

```typescript
function ReadOnlyView({
  template,
  answers,
  bannerType,
  reviewNotes,
  onWithdraw,
  withdrawing,
}: {
  template: Template | null;
  answers: Record<string, string | boolean>;
  bannerType: "review" | "approved";
  reviewNotes?: string | null;
  onWithdraw?: () => void;
  withdrawing?: boolean;
}) {
```

- [ ] **Step 3: Add withdraw button to the review banner inside ReadOnlyView**

Inside `ReadOnlyView`, find the review banner (line ~562-573):

```tsx
      {bannerType === "review" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <DigiMascot variant="construction" size="xs" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Your questionnaire is being reviewed
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your responses. You&apos;ll be notified when the review is complete.
            </p>
          </div>
        </div>
```

Change to:

```tsx
      {bannerType === "review" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <DigiMascot variant="construction" size="xs" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Your questionnaire is being reviewed
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your responses. You&apos;ll be notified when the review is complete.
            </p>
          </div>
          {onWithdraw && (
            <Button variant="outline" size="sm" onClick={onWithdraw} disabled={withdrawing} className="shrink-0">
              <Undo2 className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          )}
        </div>
```

- [ ] **Step 4: Add withdraw state and handler in the parent component**

Find where the `in_review` state renders `ReadOnlyView` (line ~232):

```tsx
  // In review — read only
  if (response.status === "in_review") {
    return (
      <ReadOnlyView
        template={template}
        answers={answers}
        bannerType="review"
      />
    );
  }
```

Change to:

```tsx
  // In review — read only
  if (response.status === "in_review") {
    return (
      <>
        <ReadOnlyView
          template={template}
          answers={answers}
          bannerType="review"
          onWithdraw={() => setWithdrawOpen(true)}
          withdrawing={withdrawing}
        />
        <WithdrawSubmissionDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          loading={withdrawing}
          stageName="discovery questionnaire"
          onConfirm={async () => {
            setWithdrawing(true);
            try {
              const res = await fetch(`/api/projects/${projectId}/discovery/withdraw`, {
                method: "POST",
              });
              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to withdraw");
              }
              toast.success("Submission withdrawn — you can now edit your responses.");
              setWithdrawOpen(false);
              router.refresh();
              fetchDiscovery();
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Failed to withdraw";
              toast.error(message);
            } finally {
              setWithdrawing(false);
            }
          }}
        />
      </>
    );
  }
```

- [ ] **Step 5: Add state variables**

Find the existing state declarations in `ClientDiscoveryContent` (near the top of the component, after the existing `useState` calls). Add:

```typescript
const [withdrawOpen, setWithdrawOpen] = useState(false);
const [withdrawing, setWithdrawing] = useState(false);
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/client-discovery-content.tsx
git commit -m "feat: add withdraw button to discovery client view"
```

---

### Task 9: Add Withdraw Button to Mapping Client Component

**Files:**
- Modify: `src/components/client-mapping-content.tsx`

- [ ] **Step 1: Add imports**

Add `Undo2` to the lucide-react import:

```typescript
import { Check, Loader2, AlertTriangle, Undo2 } from "lucide-react";
```

Add the Button import (not currently imported in this file):

```typescript
import { Button } from "@/components/ui/button";
```

Add the dialog import:

```typescript
import { WithdrawSubmissionDialog } from "@/components/withdraw-submission-dialog";
```

- [ ] **Step 2: Add state variables to ClientMappingContent**

Find the existing state declarations in the component. Add:

```typescript
const [withdrawOpen, setWithdrawOpen] = useState(false);
const [withdrawing, setWithdrawing] = useState(false);
```

- [ ] **Step 3: Update ReadOnlyMappingView function signature**

Find the `ReadOnlyMappingView` function (line ~245):

```typescript
function ReadOnlyMappingView({
  config,
  entries,
  activeCategory,
  onCategoryChange,
  bannerType,
  reviewNotes,
}: {
  config: MappingConfig;
  entries: MappingEntry[];
  activeCategory: MappingCategory;
  onCategoryChange: (cat: MappingCategory) => void;
  bannerType: "review" | "approved";
  reviewNotes?: string | null;
}) {
```

Change to:

```typescript
function ReadOnlyMappingView({
  config,
  entries,
  activeCategory,
  onCategoryChange,
  bannerType,
  reviewNotes,
  onWithdraw,
  withdrawing,
}: {
  config: MappingConfig;
  entries: MappingEntry[];
  activeCategory: MappingCategory;
  onCategoryChange: (cat: MappingCategory) => void;
  bannerType: "review" | "approved";
  reviewNotes?: string | null;
  onWithdraw?: () => void;
  withdrawing?: boolean;
}) {
```

- [ ] **Step 4: Add withdraw button to the review banner inside ReadOnlyMappingView**

Find the review banner in `ReadOnlyMappingView` (line ~263-274):

```tsx
      {bannerType === "review" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <DigiMascot variant="construction" size="xs" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Your data mapping is being reviewed
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your mappings. You&apos;ll be notified when the review is complete.
            </p>
          </div>
        </div>
```

Change to:

```tsx
      {bannerType === "review" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <DigiMascot variant="construction" size="xs" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Your data mapping is being reviewed
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your mappings. You&apos;ll be notified when the review is complete.
            </p>
          </div>
          {onWithdraw && (
            <Button variant="outline" size="sm" onClick={onWithdraw} disabled={withdrawing} className="shrink-0">
              <Undo2 className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          )}
        </div>
```

- [ ] **Step 5: Update the in_review rendering to pass props and add dialog**

Find where `ReadOnlyMappingView` is rendered for `in_review` (line ~177-186):

```tsx
  if (config.status === "in_review") {
    return (
      <ReadOnlyMappingView
        config={config}
        entries={entries}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        bannerType="review"
      />
    );
  }
```

Change to:

```tsx
  if (config.status === "in_review") {
    return (
      <>
        <ReadOnlyMappingView
          config={config}
          entries={entries}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          bannerType="review"
          onWithdraw={() => setWithdrawOpen(true)}
          withdrawing={withdrawing}
        />
        <WithdrawSubmissionDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          loading={withdrawing}
          stageName="data mapping"
          onConfirm={async () => {
            setWithdrawing(true);
            try {
              const res = await fetch(`/api/projects/${projectId}/mapping/withdraw`, {
                method: "POST",
              });
              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to withdraw");
              }
              toast.success("Submission withdrawn — you can now edit your mappings.");
              setWithdrawOpen(false);
              router.refresh();
              fetchMapping();
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Failed to withdraw";
              toast.error(message);
            } finally {
              setWithdrawing(false);
            }
          }}
        />
      </>
    );
  }
```


- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/client-mapping-content.tsx
git commit -m "feat: add withdraw button to mapping client view"
```

---

### Task 10: Add Withdraw Button to Bob Config Client Component

**Files:**
- Modify: `src/components/client-bob-config-content.tsx`

- [ ] **Step 1: Add imports**

Add `Undo2` to the lucide-react import:

```typescript
import { CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp, HelpCircle, Video, Send, Undo2 } from "lucide-react";
```

Add the dialog import:

```typescript
import { WithdrawSubmissionDialog } from "@/components/withdraw-submission-dialog";
```

- [ ] **Step 2: Add state variables**

Find the existing state declarations. Add:

```typescript
const [withdrawOpen, setWithdrawOpen] = useState(false);
const [withdrawing, setWithdrawing] = useState(false);
```

- [ ] **Step 3: Add withdraw button to the in_review banner**

Find the `in_review` banner (line ~288-301):

```tsx
      {checklist.status === "in_review" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Submitted — awaiting review
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your Digital Directions team is reviewing your configuration. You&apos;ll be
              notified when complete.
            </p>
          </div>
        </div>
      )}
```

Change to:

```tsx
      {checklist.status === "in_review" && (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Submitted — awaiting review
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Your Digital Directions team is reviewing your configuration. You&apos;ll be
                notified when complete.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setWithdrawOpen(true)} disabled={withdrawing} className="shrink-0">
              <Undo2 className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </div>
          <WithdrawSubmissionDialog
            open={withdrawOpen}
            onOpenChange={setWithdrawOpen}
            loading={withdrawing}
            stageName="HiBob configuration checklist"
            onConfirm={async () => {
              setWithdrawing(true);
              try {
                const res = await fetch(`/api/projects/${projectId}/bob-config/withdraw`, {
                  method: "POST",
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "Failed to withdraw");
                }
                toast.success("Submission withdrawn — you can now edit your checklist.");
                setWithdrawOpen(false);
                router.refresh();
                fetchChecklist();
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Failed to withdraw";
                toast.error(message);
              } finally {
                setWithdrawing(false);
              }
            }}
          />
        </>
      )}
```


- [ ] **Step 4: Add `useRouter` import and `router` declaration**

This component does not currently use `useRouter`. Add the import at the top of the file:

```typescript
import { useRouter } from "next/navigation";
```

Then inside the `ClientBobConfigContent` function, add at the top with other state declarations:

```typescript
const router = useRouter();
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/client-bob-config-content.tsx
git commit -m "feat: add withdraw button to bob-config client view"
```

---

### Task 11: Add Withdraw Button to UAT Client Component

**Files:**
- Modify: `src/components/client-uat-content.tsx`

- [ ] **Step 1: Add imports**

Add `Undo2` to the lucide-react import:

```typescript
import { Loader2, CheckCircle, XCircle, MinusCircle, Clock, Send, ExternalLink, PartyPopper, Undo2 } from "lucide-react";
```

Add the dialog import:

```typescript
import { WithdrawSubmissionDialog } from "@/components/withdraw-submission-dialog";
```

- [ ] **Step 2: Add state variables**

Find the existing state declarations. Add:

```typescript
const [withdrawOpen, setWithdrawOpen] = useState(false);
const [withdrawing, setWithdrawing] = useState(false);
```

- [ ] **Step 3: Add withdraw button and dialog to the in_review rendering**

Find the `in_review` block (line ~219-236):

```tsx
  // In review — read only
  if (uatResult.status === "in_review") {
    return (
      <>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Results Under Review</p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your test results. You&apos;ll be notified once they&apos;re approved.
            </p>
          </div>
        </div>
        <DigiHeader variant="neutral" headline="Results submitted" subtext="Sit tight — our team is reviewing your test results." />
        <ScenarioList scenarios={scenarios} results={results} isReadOnly={true} />
      </>
    );
  }
```

Change to:

```tsx
  // In review — read only
  if (uatResult.status === "in_review") {
    return (
      <>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Results Under Review</p>
            <p className="text-xs text-amber-600 mt-0.5">
              The Digital Directions team is reviewing your test results. You&apos;ll be notified once they&apos;re approved.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setWithdrawOpen(true)} disabled={withdrawing} className="shrink-0">
            <Undo2 className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
        <WithdrawSubmissionDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          loading={withdrawing}
          stageName="UAT results"
          onConfirm={async () => {
            setWithdrawing(true);
            try {
              const res = await fetch(`/api/projects/${projectId}/uat/withdraw`, {
                method: "POST",
              });
              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to withdraw");
              }
              toast.success("Submission withdrawn — you can now update your test results.");
              setWithdrawOpen(false);
              router.refresh();
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Failed to withdraw";
              toast.error(message);
            } finally {
              setWithdrawing(false);
            }
          }}
        />
        <DigiHeader variant="neutral" headline="Results submitted" subtext="Sit tight — our team is reviewing your test results." />
        <ScenarioList scenarios={scenarios} results={results} isReadOnly={true} />
      </>
    );
  }
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/client-uat-content.tsx
git commit -m "feat: add withdraw button to UAT client view"
```

---

### Task 12: Add Undo Button to Provisioning Client Component

**Files:**
- Modify: `src/components/client-provisioning-content.tsx`

- [ ] **Step 1: Add `Undo2` to imports**

Find the lucide-react import (line ~7-16):

```typescript
import {
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Video,
  Info,
} from "lucide-react";
```

Add `Undo2`:

```typescript
import {
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Video,
  Info,
  Undo2,
} from "lucide-react";
```

- [ ] **Step 2: Add `onUncomplete` and `uncompleting` props to StepCard**

Find the `StepCard` function (line ~64):

```typescript
function StepCard({
  step,
  index,
  onMarkComplete,
  completing,
}: {
  step: ProvisioningStep;
  index: number;
  onMarkComplete: (stepId: string) => void;
  completing: string | null;
}) {
```

Change to:

```typescript
function StepCard({
  step,
  index,
  onMarkComplete,
  completing,
  onUncomplete,
  uncompleting,
}: {
  step: ProvisioningStep;
  index: number;
  onMarkComplete: (stepId: string) => void;
  completing: string | null;
  onUncomplete: (stepId: string) => void;
  uncompleting: string | null;
}) {
```

- [ ] **Step 3: Replace the completed-but-not-verified UI**

Find the completed state display at the bottom of StepCard (line ~206-216):

```tsx
        {isComplete && (
          <div className="pt-1 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Marked complete on{" "}
            {new Date(step.completedAt!).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
```

Change to:

```tsx
        {isComplete && (
          <div className="pt-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Marked complete on{" "}
              {new Date(step.completedAt!).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            {!isVerified && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUncomplete(step.id)}
                disabled={uncompleting === step.id}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                {uncompleting === step.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <Undo2 className="w-3.5 h-3.5 mr-1" />
                )}
                Undo
              </Button>
            )}
          </div>
        )}
```

- [ ] **Step 4: Update the helper text below "Mark as Complete" button**

Find the helper text (line ~199-201):

```tsx
            <p className="text-xs text-slate-400 mt-2">
              Only mark complete once you&apos;ve followed all steps above. If you made a mistake,
              contact your DD Integration Specialist.
            </p>
```

Change to:

```tsx
            <p className="text-xs text-slate-400 mt-2">
              Only mark complete once you&apos;ve followed all steps above. You can undo this
              before your DD Integration Specialist verifies the step.
            </p>
```

- [ ] **Step 5: Add uncomplete handler and state in the parent component**

In `ClientProvisioningContent`, find the existing state (line ~224-225):

```typescript
  const [steps, setSteps] = useState<ProvisioningStep[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
```

Add after:

```typescript
  const [uncompleting, setUncompleting] = useState<string | null>(null);
```

Then add the handler after `handleMarkComplete`:

```typescript
  const handleUncomplete = async (stepId: string) => {
    setUncompleting(stepId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/provisioning/${stepId}/uncomplete`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to undo step");
      }
      toast.success("Step reverted — you can mark it complete again when ready.");
      await fetchSteps();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUncompleting(null);
    }
  };
```

- [ ] **Step 6: Pass new props to StepCard**

Find where `StepCard` is rendered (line ~317-323):

```tsx
          <StepCard
            key={step.id}
            step={step}
            index={i}
            onMarkComplete={handleMarkComplete}
            completing={completing}
          />
```

Change to:

```tsx
          <StepCard
            key={step.id}
            step={step}
            index={i}
            onMarkComplete={handleMarkComplete}
            completing={completing}
            onUncomplete={handleUncomplete}
            uncompleting={uncompleting}
          />
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/components/client-provisioning-content.tsx
git commit -m "feat: add undo button to provisioning step completion"
```

---

### Task 13: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

- [ ] **Step 1: Add changelog entry**

At the top of the `CHANGELOG` array (after the opening `[` and before the first existing entry), add:

```typescript
  {
    id: "2026-04-02-client-submission-withdrawal",
    date: "2026-04-02",
    title: "Withdraw Submissions & Undo",
    description: "Clients can now withdraw submitted sections for editing and undo provisioning step completions.",
    tags: ["feature"] as ChangelogTag[],
    audience: "all" as ChangelogAudience,
    items: [
      "You can now withdraw a submitted questionnaire, mapping, checklist, or UAT result before it's reviewed — edit your answers and resubmit when ready",
      "Provisioning steps can be undone before your DD specialist verifies them",
    ],
  },
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/changelog.ts
git commit -m "docs: add changelog entry for client submission withdrawal"
```

---

### Task 14: Full Build Verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors (warnings are acceptable)

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build completes successfully

- [ ] **Step 4: Commit any lint/type fixes if needed**

If steps 1-3 revealed issues, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve lint/type issues from submission withdrawal feature"
```
