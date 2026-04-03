# Client Submission Withdrawal & Undo

**Date:** 2026-04-02
**Status:** Design approved
**Scope:** Self-serve withdrawal for submitted-for-review sections + undo for provisioning steps

## Problem

When a client submits information for review (discovery, mapping, bob config, UAT), the section immediately locks to read-only. If the client realizes they made a mistake — even 30 seconds later — they have no way to fix it. They must wait for an admin to notice and click "Request Changes."

Similarly, when a client marks a provisioning step as complete, the UI currently says "If you made a mistake, contact your DD Integration Specialist" — there's no self-serve undo.

## Solution

### Part 1: Withdraw Submission (4 sections)

Add a "Withdraw Submission" button to the `in_review` banner on Discovery, Data Mapping, HiBob Config, and UAT. Clicking it (with confirmation) reverts the section to `active` status, preserving all answers. The client can edit and resubmit.

### Part 2: Undo Step Completion (Provisioning)

Add an "Undo" button on completed-but-not-yet-verified provisioning steps. Clicking it clears the completion, letting the client redo and re-mark as complete.

## Design Decisions

- **Unlimited withdrawal window** — clients can withdraw anytime before admin approves or requests changes. No time limit.
- **Preserve everything** — all answers, mappings, checklist items, and test results are preserved on withdrawal. No resets.
- **Confirmation dialog for withdrawals** — prevents accidental clicks on the 4 submit-for-review sections. Uses a shared `WithdrawSubmissionDialog` component.
- **No confirmation for provisioning undo** — low-stakes action (unchecking a step), ghost button is already subtle enough.
- **Full admin notification** — in-app + email on every withdrawal and provisioning undo, matching the existing notification pattern for cross-role state changes.
- **No DB migration** — all changes use existing columns and status values (`active`, `in_review`).
- **Go-Live excluded** — already has toggleable checklist items (undo built in).
- **Post-verification provisioning excluded** — the existing "Raise a Flag" system handles issues after admin verification.

## 1. Shared Component: WithdrawSubmissionDialog

**New file:** `src/components/withdraw-submission-dialog.tsx`

A reusable confirmation dialog used by all 4 client submission components.

```typescript
interface WithdrawSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  stageName: string; // e.g., "discovery questionnaire", "data mapping"
}
```

**Dialog content:**
- Title: "Withdraw Submission"
- Body: "This will withdraw your {stageName} submission and return it to draft mode. You can make changes and resubmit when ready."
- Buttons: Cancel (outline) | Withdraw Submission (default purple, `Undo2` icon)

Follows the existing dialog pattern used throughout the portal (Shadcn Dialog, Cancel left, Primary right).

## 2. Withdraw API Routes

Four new route files, one per section. All follow the same pattern (modeled on the existing `/submit` routes):

### Route Pattern

```
POST /api/projects/[id]/discovery/withdraw
POST /api/projects/[id]/mapping/withdraw
POST /api/projects/[id]/bob-config/withdraw
POST /api/projects/[id]/uat/withdraw
```

### Shared Logic (per route)

1. **Auth:** `requireAuth()` + client access check (`project.clientId !== user.clientId` → 403)
2. **Fetch record:** Query the section's table for the project
3. **Guard:** If `status !== "in_review"`, return 400 `"Section is not in a withdrawable state"`
4. **Update:**

| Section | Table | Set |
|---------|-------|-----|
| Discovery | `discoveryResponses` | `status: "active"`, `submittedAt: null`, `updatedAt: new Date()` |
| Mapping | `dataMappingConfigs` | `status: "active"`, `submittedAt: null`, `updatedAt: new Date()` |
| Bob Config | `bobConfigChecklist` | `status: "active"`, `submittedAt: null`, `updatedAt: new Date()` |
| UAT | `uatResults` | `status: "active"`, `submittedAt: null`, `updatedAt: new Date()` |

All answers/data columns are untouched — only status and submission timestamp change.

5. **Notify admins:** For each admin user:
   - Insert `userNotifications` record with type matching the stage (e.g., `"discovery"`, `"mapping"`, `"bob_config"`, `"uat"`)
   - Title: "{Stage name} submission withdrawn"
   - Message: `The {stage name} submission for "{project.name}" has been withdrawn by the client. They may resubmit after making changes.`
   - linkUrl: `/dashboard/admin/projects/${projectId}/{stage-slug}`

6. **Email admins:** Call the existing stage email function with a new `"withdrawn"` event:
   - `sendDiscoveryEmail({ ..., event: "withdrawn" })`
   - `sendMappingEmail({ ..., event: "withdrawn" })`
   - `sendBobConfigEmail({ ..., event: "withdrawn" })`
   - `sendUatEmail({ ..., event: "withdrawn" })`

7. **Return:** The updated record as JSON

### Bob Config Special Case

Bob Config's withdrawal does NOT reset `completedAt` on checklist items. Only the admin's "Request Changes" action resets items (existing behavior). Withdrawal simply returns to `active` with all items still marked complete — the client can then uncheck/recheck items and resubmit.

### UAT Special Case

UAT's review route uses `PUT` instead of `POST` and has a slightly different auth pattern (`getCurrentUser()` + manual role check instead of `requireAuth()`). The withdraw route should use the standard `requireAuth()` pattern for consistency with the other 3 withdraw routes, since there's no technical reason for the deviation.

## 3. Client Component Updates (4 sections)

Each client component's `in_review` rendering gets updated:

### Discovery (`client-discovery-content.tsx`)

The existing `ReadOnlyView` component with `bannerType="review"` renders an amber banner. Add to the banner:

- State: `withdrawOpen` (boolean), `withdrawing` (boolean)
- "Withdraw Submission" button: `variant="outline"`, `size="sm"`, `Undo2` icon, placed on the right side of the amber "Awaiting Review" banner
- Wire to `WithdrawSubmissionDialog` with `stageName="discovery questionnaire"`
- `onConfirm`: POST to `/api/projects/${projectId}/discovery/withdraw`, on success toast + refetch

### Mapping (`client-mapping-content.tsx`)

Same pattern as Discovery. The `ReadOnlyMappingView` with `bannerType="review"` gets a withdraw button on the banner.
- `stageName="data mapping"`
- POST to `/api/projects/${projectId}/mapping/withdraw`

### Bob Config (`client-bob-config-content.tsx`)

The `in_review` state shows an amber banner with Clock icon. Add withdraw button to that banner.
- `stageName="HiBob configuration checklist"`
- POST to `/api/projects/${projectId}/bob-config/withdraw`

### UAT (`client-uat-content.tsx`)

The `in_review` state shows an amber "Results Under Review" banner. Add withdraw button to that banner.
- `stageName="UAT results"`
- POST to `/api/projects/${projectId}/uat/withdraw`

## 4. Provisioning Undo

### New API Route

**File:** `src/app/api/projects/[id]/provisioning/[stepId]/uncomplete/route.ts`

```
POST /api/projects/[id]/provisioning/[stepId]/uncomplete
```

1. **Auth:** `requireAuth()` + client access check (same as `/complete` route)
2. **Fetch step:** Query `provisioningSteps` by stepId + projectId
3. **Guard:** Step must have `completedAt` set AND `verifiedAt` must be null. Otherwise return 400.
4. **Update:** Set `completedAt: null`, `completedBy: null` on the step
5. **Notify admins:** In-app notification:
   - Type: `"provisioning"`
   - Title: `Provisioning step uncompleted: {step.title}`
   - Message: `The "{step.title}" provisioning step for "{project.name}" has been reverted by the client.`
   - linkUrl: `/dashboard/admin/projects/${projectId}/provisioning`
6. **Email admins:** Call `sendProvisioningEmail()` with a new event `"step_uncompleted"` and `stepTitle`
7. **Return:** Updated step as JSON

### Client Component Update (`client-provisioning-content.tsx`)

In the `StepCard` component, the completed-but-not-verified state (currently lines 206-216) gets an undo button:

**Current:**
```
[CheckCircle icon] Marked complete on 15 March 2026
```

**New:**
```
[CheckCircle icon] Marked complete on 15 March 2026    [Undo2 icon] Undo
```

- Button style: `variant="ghost"`, `size="sm"`, subtle text
- State: `uncompleting` (string | null) — tracks which step is being uncompleted
- On click: POST to `/api/projects/${projectId}/provisioning/${stepId}/uncomplete`, on success toast "Step reverted" + refetch

**Also update:** Remove the helper text at line 199-201 that says "If you made a mistake, contact your DD Integration Specialist." Replace with: "You can undo this before your DD Integration Specialist verifies the step."

## 5. Email Function Updates

Add `"withdrawn"` event to 4 email functions and `"step_uncompleted"` to the provisioning email function.

### Discovery (`sendDiscoveryEmail`)

Add `"withdrawn"` to the event union type. Email content:
- Subject: `Discovery submission withdrawn — {projectName}`
- Body: `{recipientName}, the discovery questionnaire submission for "{projectName}" has been withdrawn by the client. They may resubmit after making changes. No action needed on your end.`

### Mapping (`sendMappingEmail`)

Add `"withdrawn"` to the event union type. Email content:
- Subject: `Data mapping submission withdrawn — {projectName}`
- Body: `{recipientName}, the data mapping submission for "{projectName}" has been withdrawn by the client. They may resubmit after making changes. No action needed on your end.`

### Bob Config (`sendBobConfigEmail`)

Add `"withdrawn"` to the event union type. Email content:
- Subject: `HiBob config submission withdrawn — {projectName}`
- Body: `{recipientName}, the HiBob configuration checklist submission for "{projectName}" has been withdrawn by the client. They may resubmit after making changes. No action needed on your end.`

### UAT (`sendUatEmail`)

Add `"withdrawn"` to the event union type. Email content:
- Subject: `UAT results withdrawn — {projectName}`
- Body: `{recipientName}, the UAT results submission for "{projectName}" has been withdrawn by the client. They may resubmit after making changes. No action needed on your end.`

### Provisioning (`sendProvisioningEmail`)

Add `"step_uncompleted"` to the event union type. Email content:
- Subject: `Provisioning step reverted — {projectName}`
- Body: `{recipientName}, the "{stepTitle}" provisioning step for "{projectName}" has been reverted by the client. They may re-mark it as complete when ready.`

## 6. Changelog Entry

After implementation, add to `src/lib/changelog.ts`:

```typescript
{
  id: "client-submission-withdrawal",
  date: "2026-04-XX",  // actual ship date
  audience: "all",
  tags: ["feature"],
  items: [
    "You can now withdraw a submitted questionnaire, mapping, checklist, or UAT result before it's reviewed — edit your answers and resubmit when ready",
    "Provisioning steps can be undone before your DD specialist verifies them",
  ],
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/withdraw-submission-dialog.tsx` | **New** — shared confirmation dialog |
| `src/app/api/projects/[id]/discovery/withdraw/route.ts` | **New** — withdraw API |
| `src/app/api/projects/[id]/mapping/withdraw/route.ts` | **New** — withdraw API |
| `src/app/api/projects/[id]/bob-config/withdraw/route.ts` | **New** — withdraw API |
| `src/app/api/projects/[id]/uat/withdraw/route.ts` | **New** — withdraw API |
| `src/app/api/projects/[id]/provisioning/[stepId]/uncomplete/route.ts` | **New** — undo completion API |
| `src/components/client-discovery-content.tsx` | Add withdraw button to in_review banner |
| `src/components/client-mapping-content.tsx` | Add withdraw button to in_review banner |
| `src/components/client-bob-config-content.tsx` | Add withdraw button to in_review banner |
| `src/components/client-uat-content.tsx` | Add withdraw button to in_review banner |
| `src/components/client-provisioning-content.tsx` | Add undo button to completed steps, update helper text |
| `src/lib/email.ts` | Add `"withdrawn"` event to 4 email functions, `"step_uncompleted"` to provisioning |
| `src/lib/changelog.ts` | New changelog entry |

## Out of Scope

- Admin-side UI changes (admins already have "Request Changes" — no changes needed)
- Withdrawal after admin has approved (approved is final; flag system exists for post-approval issues)
- Time-limited withdrawal windows
- Withdrawal audit log (the notification history serves as a lightweight audit trail)
- Go-Live checklist (already has toggle/undo built in)
- Post-verification provisioning undo (existing flag system handles this)
