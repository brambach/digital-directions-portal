# Enhanced KeyPay Discovery Template

**Date:** 2026-04-02
**Status:** Design approved
**Scope:** Enhanced discovery question interface + Standard KeyPay Discovery template content

## Problem

The portal's discovery template system exists and works, but:

1. The "Standard KeyPay Discovery" template only exists in seed data — production has no default KeyPay template
2. The existing seed template has generic questions that don't match how DD actually runs discovery
3. Questions lack help text, making the form unusable for clients filling it out without DD on a call
4. No conditional logic — clients see irrelevant follow-up questions regardless of their prior answers

## Solution

Enhance the `Question` interface with `helpText`, `placeholder`, and `showWhen` (conditional visibility). Create a one-time seed script to insert a "Standard KeyPay Discovery" template with ~30 real questions based on DD's actual discovery process, written in client-friendly plain language.

## Design Decisions

- **Template is a DB row, not a code constant** — inserted via a one-time script, managed through the admin template editor UI like any other template
- **Client-facing only** — no internal DD notes/to-dos in the questionnaire; those belong in admin review notes, tickets, and project phases
- **Workflow-oriented sections** (not system-oriented) — questions grouped by business process (Employee Management, Pay & Banking, etc.) rather than by system (KeyPay Questions, HiBob Questions), because clients think in business terms
- **"Not sure" as a first-class option** — on every question where the client might not know, so they don't get stuck and abandon the form
- **Conditional questions** — follow-ups hidden when irrelevant, reducing clutter from ~30 to ~20-22 visible questions for most clients
- **Loom video support already exists** — the `loomUrl` field and `LoomEmbed` component are already wired up; DD records and adds videos later through the template editor
- **No DB migration needed** — sections are stored as JSON in the `discoveryTemplates.sections` column; new fields in the Question interface are purely additive and optional

## 1. Enhanced Question Interface

All three components that define a local `Question` interface will be updated:

- `src/components/client-discovery-content.tsx`
- `src/components/manage-discovery-template-dialog.tsx`
- `src/components/admin-discovery-content.tsx`

```typescript
interface Question {
  id: string;
  label: string;           // The question text
  type: string;            // text | textarea | number | select | checkbox
  required: boolean;
  options?: string[];      // For select type
  // NEW:
  helpText?: string;       // Plain-English explanation shown below the label
  placeholder?: string;    // Example text in input fields
  showWhen?: {             // Conditional visibility
    questionId: string;    // ID of the question to check
    equals: string[];      // Show when that question's answer matches any of these
  };
}
```

All new fields are optional — existing templates without them continue working unchanged.

## 2. Client Form Renderer Changes

**File:** `src/components/client-discovery-content.tsx`

### A) Help Text

The `QuestionInput` component renders `question.helpText` as muted text between the label and the input:

```
Label *
Help text explaining the question in plain English
[input field]
```

Style: `text-xs text-slate-400` — subtle but readable.

### B) Placeholder

Pass `question.placeholder` to Input, Textarea, and Select placeholder props (replacing the current generic "Type your answer..." / "Select an option...").

### C) Conditional Visibility

Before rendering each question in the section's question list, evaluate `showWhen`:

```typescript
function isQuestionVisible(question: Question, answers: Record<string, string | boolean>): boolean {
  if (!question.showWhen) return true;
  const dependentAnswer = String(answers[question.showWhen.questionId] || "");
  return question.showWhen.equals.includes(dependentAnswer);
}
```

If not visible, skip rendering entirely. The question does not take up space.

**Scope constraint:** `showWhen.questionId` must reference a question within the same section. The template editor enforces this by only showing same-section questions in the dropdown. If a `questionId` doesn't match any question in the current section (e.g., stale data), treat the question as visible (fail-open).

### D) Validation Fix

`handleSubmit` currently validates all required questions. Update to skip hidden questions:

```typescript
// Before: validate all required questions
// After: only validate visible required questions
for (const q of section.questions) {
  if (q.required && isQuestionVisible(q, answers)) {
    // ... existing validation logic
  }
}
```

### E) Progress Calculation

Update the progress bar to exclude hidden questions from both total and answered counts:

```typescript
const visibleQuestions = sections.flatMap(s =>
  s.questions.filter(q => isQuestionVisible(q, answers))
);
const totalQuestions = visibleQuestions.length;
const answeredQuestions = visibleQuestions.filter(q => {
  const answer = answers[q.id];
  return answer !== undefined && answer !== "" && answer !== null;
}).length;
```

Same logic applies to the section navigation pills (section completion indicators).

## 3. Template Editor Changes

**File:** `src/components/manage-discovery-template-dialog.tsx`

The `QuestionEditor` sub-component gets new optional fields:

### Help Text
A textarea field below the question label input:
- Label: "Help text (optional)"
- Placeholder: "Explain this question in plain English for the client"

### Placeholder
A text input for example text:
- Label: "Placeholder text (optional)"
- Placeholder: "Example text shown in the input field"

### Show When (Conditional Logic)
A collapsible "Conditional" section with:
- A dropdown to select a question from the same section (only questions with a lower index than the current one — prevents circular dependencies)
- A multi-value input for the `equals` values (the answer values that trigger visibility)

These fields should be in a collapsible "Advanced" area to keep the editor clean for simple questions.

### Updated `createEmptyQuestion` and `cleanSections`
- `createEmptyQuestion()` returns the same defaults (new fields are optional, omitted by default)
- `cleanSections` in `handleSave` strips empty/undefined helpText, placeholder, and showWhen before saving

## 4. Admin Review View Changes

**File:** `src/components/admin-discovery-content.tsx`

The read-only view that admins see when reviewing submitted discovery responses:

- **Visible answered questions** — displayed as today (question + answer)
- **Hidden conditional questions** — shown greyed out with "Not applicable" label instead of "Not answered", so admins see the full template but understand why certain questions weren't answered
- **Help text** — displayed in lighter style (`text-xs text-slate-400`) so admins can see what the client was told

## 5. Seed Script

**File:** `scripts/seed-keypay-discovery.ts`
**npm script:** `"db:seed-discovery": "tsx scripts/seed-keypay-discovery.ts"`

### Behavior
1. Connects to DB using existing Drizzle config
2. Checks if `discoveryTemplates` has a row where `name = 'Standard KeyPay Discovery'` AND `payrollSystem = 'keypay'` AND `deletedAt IS NULL`
3. If exists: logs "Standard KeyPay Discovery template already exists (id: xxx), skipping" and exits
4. If not: inserts the template with all 6 sections and exits
5. Logs success with template ID

### Template Content

**Name:** Standard KeyPay Discovery
**Payroll System:** keypay
**Version:** 1
**isActive:** true

#### Section 1: Employee Management

| ID | Label | Type | Required | Help Text | Placeholder | showWhen |
|----|-------|------|----------|-----------|-------------|----------|
| `emp-matching` | How should we match employees between HiBob and KeyPay? | select | yes | We need a reliable way to link each employee across both systems. Email is simplest if all employees have unique company emails. Employee ID works if your IDs are consistent across both platforms. | — | — |
| | Options: `Email address`, `Employee ID`, `Not sure — we'll need help deciding` | | | | | |
| `emp-exclusions` | Are there any employees who should NOT be included in the integration? | select | yes | For example, overseas employees, contractors, or a specific group that's managed separately. | — | — |
| | Options: `No — include everyone`, `Yes — some employees should be excluded` | | | | | |
| `emp-exclusions-detail` | Which employees should be excluded and why? | textarea | yes | E.g., "All overseas employees except two expats who should be included." | Describe the employees or groups to exclude... | `emp-exclusions` = `Yes — some employees should be excluded` |
| `emp-location-mapping` | How should HiBob locations map to KeyPay's primary location? | select | yes | KeyPay needs a "Primary Location" for each employee. We'll map this from a field in HiBob — most clients use Site, Department, or Cost Centre Code. | — | — |
| | Options: `Site / Department`, `Cost Centre Code`, `Custom field`, `Not sure — we'll need help` | | | | | |
| `emp-whm` | Do any employees have Working Holiday Maker status? | select | yes | Working Holiday Makers have different tax rules in Australia. If you have any, we'll need to handle their tax treatment separately. | — | — |
| | Options: `Yes`, `No`, `Not sure` | | | | | |
| `emp-custom-fields` | Are there any custom fields in HiBob you'd like synced to KeyPay? | select | yes | Custom fields are anything your company has added to HiBob beyond the standard fields (e.g., a custom "Division" or "Cost Centre" field). | — | — |
| | Options: `No`, `Yes`, `Not sure yet — can we review this together?` | | | | | |
| `emp-custom-fields-detail` | Which custom fields need to sync? | textarea | yes | List the field names as they appear in HiBob. | e.g., Division, Cost Centre, Award Level... | `emp-custom-fields` = `Yes` |

#### Section 2: Pay & Banking

| ID | Label | Type | Required | Help Text | Placeholder | showWhen |
|----|-------|------|----------|-----------|-------------|----------|
| `bank-count` | How many bank accounts can employees be paid into? | select | yes | Most employees have 1-2 accounts — for example, a primary account for most of their pay and a savings account for a set amount. | — | — |
| | Options: `1`, `2`, `3 or more` | | | | | |
| `bank-split` | How should payments be split across accounts? | select | yes | This tells us how to divide pay when an employee has more than one bank account. | — | `bank-count` = `2`, `3 or more` |
| | Options: `A set dollar amount to each extra account, with the rest going to their main account`, `A percentage split across accounts`, `A mix of both methods`, `Not sure` | | | | | |
| `pay-allowances` | Are there any allowances or deductions that need to flow from HiBob to KeyPay? | select | yes | For example: first aid allowance, novated leases, government paid parental leave, director fees, etc. | — | — |
| | Options: `No`, `Yes`, `Not sure` | | | | | |
| `pay-allowances-detail` | Describe the allowances or deductions | textarea | yes | List each one and how it's currently managed. | e.g., First Aid Allowance — $20/week for certified staff... | `pay-allowances` = `Yes` |

#### Section 3: Superannuation

| ID | Label | Type | Required | Help Text | Placeholder | showWhen |
|----|-------|------|----------|-----------|-------------|----------|
| `super-types` | Which types of super funds do your employees use? | select | yes | Most companies support regular industry funds (like AustralianSuper, REST) and sometimes Self-Managed Super Funds (SMSFs) where the employee manages their own fund. | — | — |
| | Options: `Regular/industry funds only`, `Regular + Self-Managed (SMSF)`, `Regular + SMSF + Employer-nominated`, `All types`, `Not sure` | | | | | |
| `super-count` | How many super funds can an employee have? | select | yes | Most employees have a single fund. Some may split contributions across multiple funds. | — | — |
| | Options: `1`, `More than 1` | | | | | |
| `super-split` | How should super contributions be split? | select | yes | — | — | `super-count` = `More than 1` |
| | Options: `Fixed dollar amount to each fund, remainder to primary`, `Percentage split`, `Not sure` | | | | | |
| `super-sal-sacrifice` | Do any employees have salary sacrifice arrangements for super? | select | yes | Salary sacrifice is where an employee chooses to put extra pre-tax money into their super fund, above the standard employer contribution. | — | — |
| | Options: `Yes`, `No`, `Not sure` | | | | | |
| `super-sal-sacrifice-end` | How is the salary sacrifice end date handled? | select | yes | Some salary sacrifice arrangements are time-limited, others run indefinitely. | — | `super-sal-sacrifice` = `Yes` |
| | Options: `Set end date`, `No end date — ongoing until changed`, `Not sure` | | | | | |

#### Section 4: Leave

| ID | Label | Type | Required | Help Text | Placeholder | showWhen |
|----|-------|------|----------|-----------|-------------|----------|
| `leave-types` | Which leave types does your company use? | textarea | yes | E.g., Annual Leave, Personal/Sick Leave, Long Service Leave, Parental Leave, etc. Include any custom leave types. | Annual Leave, Personal Leave, Long Service Leave... | — |
| `leave-accrual` | How are leave balances accrued? | select | yes | — | — | — |
| | Options: `Based on hours worked`, `Fixed accrual per period`, `Based on length of service`, `Other`, `Not sure` | | | | | |
| `leave-custom` | Do you have any custom leave policies? | select | yes | E.g., birthday leave, wellness days, study leave, volunteer days. | — | — |
| | Options: `No`, `Yes` | | | | | |
| `leave-custom-detail` | Describe your custom leave policies | textarea | yes | — | e.g., Birthday Leave — 1 day per year on employee's birthday... | `leave-custom` = `Yes` |
| `leave-balance-migration` | Do you need existing leave balances migrated into the integration? | select | yes | If your employees already have accrued leave, we can set up a one-time migration of those balances. This can also be done after go-live. | — | — |
| | Options: `Yes`, `No`, `Not sure` | | | | | |

#### Section 5: Integration Preferences

| ID | Label | Type | Required | Help Text | Placeholder | showWhen |
|----|-------|------|----------|-----------|-------------|----------|
| `int-timesheets` | Will employees use timesheets in KeyPay? | select | yes | KeyPay supports three timesheet modes per employee. "Always use timesheets" means hours are entered each period. "Only for exceptions" means standard hours are assumed unless changed. "Do not use timesheets" means pay is based on salary/contract. | — | — |
| | Options: `Always use timesheets`, `Only for exceptions`, `Do not use timesheets`, `Not sure — we need to discuss` | | | | | |
| `int-payslip` | Would you like KeyPay's payslip notification turned on or off? | select | yes | Most clients turn this off because the integration copies payslips into HiBob, so employees only need to check one place. Leaving it on can cause confusion with duplicate notifications. | — | — |
| | Options: `Off — we'll use HiBob for payslips`, `On — send payslips from KeyPay`, `Not sure` | | | | | |
| `int-terminations` | Should employee terminations sync automatically from HiBob to KeyPay? | select | yes | When enabled, terminating an employee in HiBob will automatically process their termination in KeyPay. | — | — |
| | Options: `Yes`, `No — we'll handle terminations manually`, `Need to discuss` | | | | | |
| `int-exclusions` | Are there any aspects of the integration you do NOT want included? | select | yes | — | — | — |
| | Options: `No — include everything standard`, `Yes — there are exclusions` | | | | | |
| `int-exclusions-detail` | What should be excluded? | textarea | yes | Describe anything you'd prefer to manage manually rather than through the integration. | — | `int-exclusions` = `Yes — there are exclusions` |
| `int-third-party` | Are there other third-party systems you integrate (or plan to integrate) with HiBob? | textarea | no | E.g., Culture Amp, Deputy, Perk Box, overseas payroll systems. This helps us understand the full picture and avoid conflicts. | e.g., Culture Amp for engagement surveys, Deputy for rostering... | — |

#### Section 6: Additional Questions & Concerns

| ID | Label | Type | Required | Help Text | Placeholder | showWhen |
|----|-------|------|----------|-----------|-------------|----------|
| `additional-golive` | Do you have a target go-live date? | text | no | If you have a date in mind, let us know and we'll work backwards from there. | e.g., March 25, 2026 | — |
| `additional-other` | Is there anything else you'd like us to know about your setup? | textarea | no | Anything that might be relevant — unusual processes, upcoming changes, concerns, etc. | — | — |
| `additional-questions` | Do you have any questions for us about the integration process? | textarea | no | No question is too small. We're here to help and will follow up on anything you raise here. | — | — |

#### Section Descriptions

Each section includes a warm intro:

1. **Employee Management:** "This section helps us understand who will be included in the integration and how we'll match employees between HiBob and KeyPay."
2. **Pay & Banking:** "Tell us about how your employees are paid so we can configure bank account details correctly."
3. **Superannuation:** "We need to understand your superannuation setup to make sure contributions are handled correctly."
4. **Leave:** "Help us understand your leave types and policies so we can map them between HiBob and KeyPay."
5. **Integration Preferences:** "These questions help us configure the technical details of how HiBob and KeyPay will work together."
6. **Additional Questions & Concerns:** "Use this section to share anything else that might be relevant, or to ask us any questions. This should take about 15-20 minutes total. You can save your progress and come back anytime."

## 6. Changelog Entry

After implementation, add to `src/lib/changelog.ts`:

```typescript
{
  id: "enhanced-keypay-discovery-template",
  date: "2026-04-XX",  // actual ship date
  audience: "all",
  tags: ["feature"],
  items: [
    "New Standard KeyPay Discovery template with guided questions, help text, and smart conditional logic",
    "Discovery questions now show helpful explanations and hide irrelevant follow-ups based on your answers",
    "Loom video guides available per section (videos added by DD team)",
  ],
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/client-discovery-content.tsx` | Add helpText rendering, placeholder support, conditional visibility, smart validation, smart progress |
| `src/components/manage-discovery-template-dialog.tsx` | Add helpText, placeholder, showWhen fields to question editor |
| `src/components/admin-discovery-content.tsx` | Show hidden questions as "Not applicable", display help text |
| `scripts/seed-keypay-discovery.ts` | New file — one-time script to insert Standard KeyPay Discovery template |
| `package.json` | Add `db:seed-discovery` script |
| `src/lib/changelog.ts` | New changelog entry |

## Out of Scope

- Loom video content (DD records these separately, slots are ready)
- MYOB / Deputy / Generic discovery templates (same pattern, future work)
- Drag-and-drop question reordering in the template editor
- Cross-section conditional logic (showWhen only references questions within the same section)
- Estimated time per section (the overall "15-20 minutes" note is in the last section's description)
