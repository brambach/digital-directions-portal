# Enhanced KeyPay Discovery Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conditional logic, help text, and placeholder support to the discovery question system, then seed a production-ready "Standard KeyPay Discovery" template with ~30 client-friendly questions.

**Architecture:** Extend the JSON-stored `Question` interface with three optional fields (`helpText`, `placeholder`, `showWhen`). Update the client form renderer for conditional visibility, the template editor for authoring these fields, and the admin review view for displaying hidden questions. Insert the template via a one-time DB script.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Drizzle ORM, tsx scripts

**Spec:** `docs/superpowers/specs/2026-04-02-enhanced-keypay-discovery-template-design.md`

---

### Task 1: Update Question Interface in Client Form Renderer

**Files:**
- Modify: `src/components/client-discovery-content.tsx:31-37` (Question interface)

This task adds the three new optional fields to the Question interface and creates the `isQuestionVisible` helper function. No rendering changes yet — just the type and utility.

- [ ] **Step 1: Update the Question interface**

In `src/components/client-discovery-content.tsx`, replace the existing `Question` interface (lines 31-37):

```typescript
interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  helpText?: string;
  placeholder?: string;
  showWhen?: {
    questionId: string;
    equals: string[];
  };
}
```

- [ ] **Step 2: Add the `isQuestionVisible` helper function**

Add this function after the `Question` interface (before the `Section` interface at line 39):

```typescript
function isQuestionVisible(
  question: Question,
  answers: Record<string, string | boolean>
): boolean {
  if (!question.showWhen) return true;
  const dependentAnswer = String(answers[question.showWhen.questionId] || "");
  return question.showWhen.equals.includes(dependentAnswer);
}
```

- [ ] **Step 3: Verify the dev server still compiles**

Run: `npm run dev`
Expected: No TypeScript errors. Existing templates still render normally (new fields are all optional).

- [ ] **Step 4: Commit**

```bash
git add src/components/client-discovery-content.tsx
git commit -m "$(cat <<'EOF'
feat(discovery): add helpText, placeholder, showWhen to Question interface

Extend the Question interface with optional fields for help text,
placeholder text, and conditional visibility. Add isQuestionVisible
helper. No rendering changes yet — all fields are optional so
existing templates continue to work.
EOF
)"
```

---

### Task 2: Render Help Text, Placeholders, and Conditional Visibility in Client Form

**Files:**
- Modify: `src/components/client-discovery-content.tsx:377-386` (question rendering loop)
- Modify: `src/components/client-discovery-content.tsx:435-508` (QuestionInput component)
- Modify: `src/components/client-discovery-content.tsx:246-257` (progress calculation)
- Modify: `src/components/client-discovery-content.tsx:149-165` (submit validation)
- Modify: `src/components/client-discovery-content.tsx:306-310` (section completion pills)

- [ ] **Step 1: Add conditional visibility to the question rendering loop**

In the section content area (around line 377), the questions are currently rendered like this:

```tsx
{section.questions.map((question) => (
  <QuestionInput
    key={question.id}
    question={question}
    value={answers[question.id]}
    onChange={(value) => handleAnswerChange(question.id, value)}
  />
))}
```

Replace with:

```tsx
{section.questions
  .filter((question) => isQuestionVisible(question, answers))
  .map((question) => (
    <QuestionInput
      key={question.id}
      question={question}
      value={answers[question.id]}
      onChange={(value) => handleAnswerChange(question.id, value)}
    />
  ))}
```

- [ ] **Step 2: Add help text and placeholder rendering to QuestionInput**

Replace the entire `QuestionInput` component (starting around line 435) with:

```tsx
function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const stringValue = typeof value === "boolean" ? "" : (value || "");
  const placeholder = question.placeholder || (
    question.type === "textarea" ? "Type your answer..." :
    question.type === "text" ? "Type your answer..." :
    question.type === "number" ? "Enter a number..." :
    undefined
  );

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium text-slate-700">
          {question.label}
          {question.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {question.helpText && (
          <p className="text-xs text-slate-400 mt-0.5">{question.helpText}</p>
        )}
      </div>

      {question.type === "text" && (
        <Input
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-white border-slate-200 rounded-xl"
        />
      )}

      {question.type === "textarea" && (
        <Textarea
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-white border-slate-200 rounded-xl min-h-[100px]"
        />
      )}

      {question.type === "number" && (
        <Input
          type="number"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-white border-slate-200 rounded-xl w-48"
        />
      )}

      {question.type === "select" && question.options && (
        <Select value={stringValue} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="bg-white border-slate-200 rounded-xl w-full max-w-sm">
            <SelectValue placeholder={question.placeholder || "Select an option..."} />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {question.type === "checkbox" && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true || value === "true"}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-[#7C1CFF] focus:ring-[#7C1CFF]"
          />
          <span className="text-sm text-slate-600">Yes</span>
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update validation to skip hidden questions**

In the `handleSubmit` function (around line 149), the validation loop currently checks all required questions. Update it to skip hidden ones:

```typescript
const unanswered: string[] = [];
for (const section of template.sections) {
  for (const q of section.questions) {
    if (q.required && isQuestionVisible(q, answers)) {
      const answer = answers[q.id];
      if (answer === undefined || answer === "" || answer === null) {
        unanswered.push(`"${q.label}" in "${section.title}"`);
      }
    }
  }
}
```

- [ ] **Step 4: Update progress calculation to exclude hidden questions**

Replace the progress calculation block (around lines 246-257) with:

```typescript
const totalQuestions = sections.reduce(
  (sum, s) => sum + s.questions.filter((q) => isQuestionVisible(q, answers)).length,
  0
);
const answeredQuestions = sections.reduce(
  (sum, s) =>
    sum +
    s.questions
      .filter((q) => isQuestionVisible(q, answers))
      .filter((q) => {
        const answer = answers[q.id];
        return answer !== undefined && answer !== "" && answer !== null;
      }).length,
  0
);
const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
```

- [ ] **Step 5: Update section navigation pill completion check**

In the section navigation pills (around line 306), update the `sectionAnswered` and `isComplete` calculations to filter by visibility:

```tsx
const visibleQuestions = s.questions.filter((q) => isQuestionVisible(q, answers));
const sectionAnswered = visibleQuestions.filter((q) => {
  const answer = answers[q.id];
  return answer !== undefined && answer !== "" && answer !== null;
}).length;
const isComplete = visibleQuestions.length > 0 && sectionAnswered === visibleQuestions.length;
```

- [ ] **Step 6: Update the ReadOnlyView to show help text and handle hidden questions**

In the `ReadOnlyView` component (around line 512), update the question rendering to show help text and distinguish hidden questions:

Replace the question mapping inside the read-only sections (around lines 566-589) with:

```tsx
{section.questions.map((q) => {
  const answer = answers[q.id];
  const hasAnswer = answer !== undefined && answer !== "" && answer !== null;
  const visible = isQuestionVisible(q, answers);

  return (
    <div
      key={q.id}
      className={cn(
        "flex gap-4 p-3 rounded-lg border",
        visible
          ? "bg-slate-50 border-slate-100"
          : "bg-slate-50/50 border-slate-50 opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">
          {q.label}
          {q.required && <span className="text-red-400 ml-0.5">*</span>}
        </p>
        {q.helpText && (
          <p className="text-xs text-slate-400 mt-0.5">{q.helpText}</p>
        )}
      </div>
      <div className="flex-1 min-w-0 text-right">
        {!visible ? (
          <p className="text-sm text-slate-300 italic">Not applicable</p>
        ) : hasAnswer ? (
          <p className="text-sm text-slate-900">
            {typeof answer === "boolean" ? (answer ? "Yes" : "No") : String(answer)}
          </p>
        ) : (
          <p className="text-sm text-slate-300 italic">Not answered</p>
        )}
      </div>
    </div>
  );
})}
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`
Open a project with an existing discovery response. Verify:
- Existing questions still display normally (no help text, no showWhen = no change)
- The ReadOnlyView still renders properly
- Progress bar still works

- [ ] **Step 8: Commit**

```bash
git add src/components/client-discovery-content.tsx
git commit -m "$(cat <<'EOF'
feat(discovery): render help text, placeholders, and conditional visibility

Client form now shows helpText below question labels, uses custom
placeholders, and hides questions when their showWhen condition is
not met. Validation and progress calculation skip hidden questions.
ReadOnlyView shows hidden questions as "Not applicable".
EOF
)"
```

---

### Task 3: Update Admin Review View

**Files:**
- Modify: `src/components/admin-discovery-content.tsx:36-42` (Question interface)
- Modify: `src/components/admin-discovery-content.tsx:529-564` (question rendering in review)
- Modify: `src/components/admin-discovery-content.tsx:444-454` (progress counting)

- [ ] **Step 1: Update the Question interface**

In `src/components/admin-discovery-content.tsx`, replace the existing `Question` interface (lines 36-42):

```typescript
interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  helpText?: string;
  placeholder?: string;
  showWhen?: {
    questionId: string;
    equals: string[];
  };
}
```

- [ ] **Step 2: Add the `isQuestionVisible` helper function**

Add after the `Question` interface:

```typescript
function isQuestionVisible(
  question: Question,
  answers: Record<string, string | boolean>
): boolean {
  if (!question.showWhen) return true;
  const dependentAnswer = String(answers[question.showWhen.questionId] || "");
  return question.showWhen.equals.includes(dependentAnswer);
}
```

- [ ] **Step 3: Update question rendering in the review view**

In the review section (around line 529), replace the question rendering block with:

```tsx
{section.questions.map((question) => {
  const answer = response.responses[question.id];
  const hasAnswer = answer !== undefined && answer !== "" && answer !== null;
  const visible = isQuestionVisible(question, response.responses);

  return (
    <div
      key={question.id}
      className={cn(
        "flex gap-4 p-3 rounded-lg border",
        visible
          ? "bg-slate-50 border-slate-100"
          : "bg-slate-50/50 border-slate-50 opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">
          {question.label}
          {question.required && (
            <span className="text-red-400 ml-0.5">*</span>
          )}
        </p>
        {question.helpText && (
          <p className="text-xs text-slate-400 mt-0.5">{question.helpText}</p>
        )}
        <span className="text-[10px] text-slate-400 uppercase font-semibold">
          {question.type}
        </span>
      </div>
      <div className="flex-1 min-w-0 text-right">
        {!visible ? (
          <p className="text-sm text-slate-300 italic">Not applicable</p>
        ) : hasAnswer ? (
          <p className="text-sm text-slate-900">
            {typeof answer === "boolean"
              ? answer
                ? "Yes"
                : "No"
              : String(answer)}
          </p>
        ) : (
          <p className="text-sm text-slate-300 italic">Not answered</p>
        )}
      </div>
    </div>
  );
})}
```

- [ ] **Step 4: Update answer count to reflect visible questions**

In the review view progress counting (around line 444-454), update to only count visible questions:

```typescript
const totalQuestions = sections.reduce((sum, s) => sum + s.questions.filter((q) => isQuestionVisible(q, response.responses)).length, 0);
const answeredQuestions = sections.reduce(
  (sum, s) =>
    sum +
    s.questions
      .filter((q) => isQuestionVisible(q, response.responses))
      .filter((q) => {
        const answer = response.responses[q.id];
        return answer !== undefined && answer !== "" && answer !== null;
      }).length,
  0
);
```

Also update the per-section `sectionAnswered` count (around line 485-488):

```typescript
const visibleInSection = section.questions.filter((q) => isQuestionVisible(q, response.responses));
const sectionAnswered = visibleInSection.filter((q) => {
  const answer = response.responses[q.id];
  return answer !== undefined && answer !== "" && answer !== null;
}).length;
```

And update the display (around line 511):

```tsx
<span className="text-xs text-slate-400 shrink-0">
  {sectionAnswered}/{visibleInSection.length} answered
</span>
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`
Navigate to an admin project discovery review page. Verify existing templates still render correctly.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin-discovery-content.tsx
git commit -m "$(cat <<'EOF'
feat(discovery): add conditional visibility and help text to admin review

Admin review view now shows hidden conditional questions greyed out
as "Not applicable". Help text displayed below questions so admins
see what clients were told. Progress counts only visible questions.
EOF
)"
```

---

### Task 4: Update Template Editor with Help Text, Placeholder, and ShowWhen Fields

**Files:**
- Modify: `src/components/manage-discovery-template-dialog.tsx:34-40` (Question interface)
- Modify: `src/components/manage-discovery-template-dialog.tsx:462-563` (QuestionEditor component)
- Modify: `src/components/manage-discovery-template-dialog.tsx:228-244` (cleanSections in handleSave)

- [ ] **Step 1: Update the Question interface**

In `src/components/manage-discovery-template-dialog.tsx`, replace the existing `Question` interface (lines 34-40):

```typescript
interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  helpText?: string;
  placeholder?: string;
  showWhen?: {
    questionId: string;
    equals: string[];
  };
}
```

- [ ] **Step 2: Update cleanSections to strip empty new fields**

In `handleSave` (around line 228), update the `cleanSections` mapping to strip empty new fields:

```typescript
const cleanSections = sections.map((s) => ({
  ...s,
  loomUrl: s.loomUrl?.trim() || undefined,
  description: s.description?.trim() || undefined,
  questions: s.questions.map((q) => ({
    ...q,
    options: q.type === "select" ? q.options?.filter((o) => o.trim()) : undefined,
    helpText: q.helpText?.trim() || undefined,
    placeholder: q.placeholder?.trim() || undefined,
    showWhen: q.showWhen?.questionId ? q.showWhen : undefined,
  })),
}));
```

- [ ] **Step 3: Update QuestionEditor with help text, placeholder, and showWhen fields**

Replace the `QuestionEditor` component (starting around line 462) with the version below. This adds three fields inside a collapsible "Advanced" section:

```tsx
function QuestionEditor({
  question,
  index,
  sectionQuestions,
  onUpdate,
  onRemove,
}: {
  question: Question;
  index: number;
  sectionQuestions: Question[];
  onUpdate: (field: keyof Question, value: unknown) => void;
  onRemove: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(
    !!(question.helpText || question.placeholder || question.showWhen?.questionId)
  );

  // Only questions above this one in the same section (prevents circular deps)
  const priorQuestions = sectionQuestions.slice(0, index);

  return (
    <div className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100">
      <span className="text-xs font-bold text-slate-300 mt-2.5 shrink-0 w-5 text-center">
        {index + 1}
      </span>
      <div className="flex-1 space-y-2">
        <Input
          value={question.label}
          onChange={(e) => onUpdate("label", e.target.value)}
          placeholder="Question text..."
          className="bg-white border-slate-200 rounded-lg text-sm h-9"
        />
        <div className="flex items-center gap-3">
          <Select
            value={question.type}
            onValueChange={(v) => {
              onUpdate("type", v);
              if (v === "select" && (!question.options || question.options.length === 0)) {
                onUpdate("options", ["", ""]);
              }
            }}
          >
            <SelectTrigger className="w-32 h-8 text-xs bg-white border-slate-200 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Short text</SelectItem>
              <SelectItem value="textarea">Long text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={question.required}
              onCheckedChange={(v) => onUpdate("required", v)}
              className="h-4 w-8"
            />
            <span className="text-xs text-slate-500">Required</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-400 hover:text-slate-600 ml-auto"
          >
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>
        </div>

        {/* Options for select type */}
        {question.type === "select" && (
          <div className="space-y-1.5 pl-1">
            {(question.options || []).map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...(question.options || [])];
                    newOptions[oIdx] = e.target.value;
                    onUpdate("options", newOptions);
                  }}
                  placeholder={`Option ${oIdx + 1}`}
                  className="bg-white border-slate-200 rounded-lg text-xs h-8 flex-1"
                />
                <button
                  onClick={() => {
                    const newOptions = (question.options || []).filter(
                      (_, i) => i !== oIdx
                    );
                    onUpdate("options", newOptions);
                  }}
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onUpdate("options", [...(question.options || []), ""])}
              className="text-xs h-7 text-slate-500"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add option
            </Button>
          </div>
        )}

        {/* Advanced fields */}
        {showAdvanced && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Help text (optional)</label>
              <Textarea
                value={question.helpText || ""}
                onChange={(e) => onUpdate("helpText", e.target.value)}
                placeholder="Explain this question in plain English for the client"
                className="bg-white border-slate-200 rounded-lg text-xs min-h-[50px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Placeholder text (optional)</label>
              <Input
                value={question.placeholder || ""}
                onChange={(e) => onUpdate("placeholder", e.target.value)}
                placeholder="Example text shown in the input field"
                className="bg-white border-slate-200 rounded-lg text-xs h-8"
              />
            </div>
            {priorQuestions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Show only when (optional)</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={question.showWhen?.questionId || ""}
                    onValueChange={(v) => {
                      if (!v) {
                        onUpdate("showWhen", undefined);
                      } else {
                        onUpdate("showWhen", {
                          questionId: v,
                          equals: question.showWhen?.equals || [],
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs bg-white border-slate-200 rounded-lg">
                      <SelectValue placeholder="Select a question..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No condition</SelectItem>
                      {priorQuestions.map((pq) => (
                        <SelectItem key={pq.id} value={pq.id}>
                          {pq.label || `Question ${sectionQuestions.indexOf(pq) + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {question.showWhen?.questionId && (
                  <div className="space-y-1 pl-2">
                    <label className="text-xs text-slate-400">equals any of:</label>
                    {(question.showWhen.equals || []).map((val, vIdx) => (
                      <div key={vIdx} className="flex items-center gap-2">
                        <Input
                          value={val}
                          onChange={(e) => {
                            const newEquals = [...(question.showWhen?.equals || [])];
                            newEquals[vIdx] = e.target.value;
                            onUpdate("showWhen", {
                              ...question.showWhen,
                              equals: newEquals,
                            });
                          }}
                          placeholder="Matching value..."
                          className="bg-white border-slate-200 rounded-lg text-xs h-7 flex-1"
                        />
                        <button
                          onClick={() => {
                            const newEquals = (question.showWhen?.equals || []).filter(
                              (_, i) => i !== vIdx
                            );
                            onUpdate("showWhen", {
                              ...question.showWhen,
                              equals: newEquals,
                            });
                          }}
                          className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        onUpdate("showWhen", {
                          ...question.showWhen,
                          equals: [...(question.showWhen?.equals || []), ""],
                        })
                      }
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add value
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0 mt-1"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Add `useState` import for showAdvanced state**

The file already imports `useState` from React (line 3), so no change needed. Confirm it's there.

- [ ] **Step 5: Add `Textarea` import**

Check if `Textarea` is already imported. If not, add it alongside the existing `Input` import:

```typescript
import { Textarea } from "@/components/ui/textarea";
```

- [ ] **Step 6: Update QuestionEditor usage to pass sectionQuestions**

In the sections builder (around line 393), update the `QuestionEditor` call to pass the section's questions array:

```tsx
<QuestionEditor
  key={question.id}
  question={question}
  index={qIdx}
  sectionQuestions={section.questions}
  onUpdate={(field, value) =>
    updateQuestion(section.id, question.id, field, value)
  }
  onRemove={() => removeQuestion(section.id, question.id)}
/>
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`
Navigate to Admin Settings > Discovery Templates. Edit an existing template or create a new one. Verify:
- "Advanced" toggle shows/hides the new fields
- Help text, placeholder, and showWhen fields render
- Saving a template with new fields works
- Saving a template without new fields still works (backwards compatible)

- [ ] **Step 8: Commit**

```bash
git add src/components/manage-discovery-template-dialog.tsx
git commit -m "$(cat <<'EOF'
feat(discovery): add helpText, placeholder, showWhen to template editor

Template editor now supports editing help text, placeholder text,
and conditional visibility rules per question. New fields are in a
collapsible "Advanced" section. ShowWhen dropdown only shows
questions above the current one to prevent circular dependencies.
EOF
)"
```

---

### Task 5: Create the Seed Script

**Files:**
- Create: `scripts/seed-keypay-discovery.ts`
- Modify: `package.json` (add `db:seed-discovery` script)

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-keypay-discovery.ts`:

```typescript
/**
 * Seed the Standard KeyPay Discovery template into the database.
 *
 * Usage:
 *   npm run db:seed-discovery
 *
 * Safe to run multiple times — skips if the template already exists.
 * Does NOT touch any other data in the database.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { discoveryTemplates } from "../src/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const sections = [
  {
    id: "employee-management",
    title: "Employee Management",
    description:
      "This section helps us understand who will be included in the integration and how we'll match employees between HiBob and KeyPay.",
    loomUrl: "",
    questions: [
      {
        id: "emp-matching",
        label: "How should we match employees between HiBob and KeyPay?",
        type: "select",
        required: true,
        helpText:
          "We need a reliable way to link each employee across both systems. Email is simplest if all employees have unique company emails. Employee ID works if your IDs are consistent across both platforms.",
        options: [
          "Email address",
          "Employee ID",
          "Not sure — we'll need help deciding",
        ],
      },
      {
        id: "emp-exclusions",
        label:
          "Are there any employees who should NOT be included in the integration?",
        type: "select",
        required: true,
        helpText:
          "For example, overseas employees, contractors, or a specific group that's managed separately.",
        options: [
          "No — include everyone",
          "Yes — some employees should be excluded",
        ],
      },
      {
        id: "emp-exclusions-detail",
        label: "Which employees should be excluded and why?",
        type: "textarea",
        required: true,
        helpText:
          'E.g., "All overseas employees except two expats who should be included."',
        placeholder: "Describe the employees or groups to exclude...",
        showWhen: {
          questionId: "emp-exclusions",
          equals: ["Yes — some employees should be excluded"],
        },
      },
      {
        id: "emp-location-mapping",
        label:
          "How should HiBob locations map to KeyPay's primary location?",
        type: "select",
        required: true,
        helpText:
          "KeyPay needs a \"Primary Location\" for each employee. We'll map this from a field in HiBob — most clients use Site, Department, or Cost Centre Code.",
        options: [
          "Site / Department",
          "Cost Centre Code",
          "Custom field",
          "Not sure — we'll need help",
        ],
      },
      {
        id: "emp-whm",
        label: "Do any employees have Working Holiday Maker status?",
        type: "select",
        required: true,
        helpText:
          "Working Holiday Makers have different tax rules in Australia. If you have any, we'll need to handle their tax treatment separately.",
        options: ["Yes", "No", "Not sure"],
      },
      {
        id: "emp-custom-fields",
        label:
          "Are there any custom fields in HiBob you'd like synced to KeyPay?",
        type: "select",
        required: true,
        helpText:
          'Custom fields are anything your company has added to HiBob beyond the standard fields (e.g., a custom "Division" or "Cost Centre" field).',
        options: [
          "No",
          "Yes",
          "Not sure yet — can we review this together?",
        ],
      },
      {
        id: "emp-custom-fields-detail",
        label: "Which custom fields need to sync?",
        type: "textarea",
        required: true,
        helpText: "List the field names as they appear in HiBob.",
        placeholder: "e.g., Division, Cost Centre, Award Level...",
        showWhen: {
          questionId: "emp-custom-fields",
          equals: ["Yes"],
        },
      },
    ],
  },
  {
    id: "pay-banking",
    title: "Pay & Banking",
    description:
      "Tell us about how your employees are paid so we can configure bank account details correctly.",
    loomUrl: "",
    questions: [
      {
        id: "bank-count",
        label: "How many bank accounts can employees be paid into?",
        type: "select",
        required: true,
        helpText:
          "Most employees have 1-2 accounts — for example, a primary account for most of their pay and a savings account for a set amount.",
        options: ["1", "2", "3 or more"],
      },
      {
        id: "bank-split",
        label: "How should payments be split across accounts?",
        type: "select",
        required: true,
        helpText:
          "This tells us how to divide pay when an employee has more than one bank account.",
        options: [
          "A set dollar amount to each extra account, with the rest going to their main account",
          "A percentage split across accounts",
          "A mix of both methods",
          "Not sure",
        ],
        showWhen: {
          questionId: "bank-count",
          equals: ["2", "3 or more"],
        },
      },
      {
        id: "pay-allowances",
        label:
          "Are there any allowances or deductions that need to flow from HiBob to KeyPay?",
        type: "select",
        required: true,
        helpText:
          "For example: first aid allowance, novated leases, government paid parental leave, director fees, etc.",
        options: ["No", "Yes", "Not sure"],
      },
      {
        id: "pay-allowances-detail",
        label: "Describe the allowances or deductions",
        type: "textarea",
        required: true,
        helpText: "List each one and how it's currently managed.",
        placeholder:
          "e.g., First Aid Allowance — $20/week for certified staff...",
        showWhen: {
          questionId: "pay-allowances",
          equals: ["Yes"],
        },
      },
    ],
  },
  {
    id: "superannuation",
    title: "Superannuation",
    description:
      "We need to understand your superannuation setup to make sure contributions are handled correctly.",
    loomUrl: "",
    questions: [
      {
        id: "super-types",
        label: "Which types of super funds do your employees use?",
        type: "select",
        required: true,
        helpText:
          "Most companies support regular industry funds (like AustralianSuper, REST) and sometimes Self-Managed Super Funds (SMSFs) where the employee manages their own fund.",
        options: [
          "Regular/industry funds only",
          "Regular + Self-Managed (SMSF)",
          "Regular + SMSF + Employer-nominated",
          "All types",
          "Not sure",
        ],
      },
      {
        id: "super-count",
        label: "How many super funds can an employee have?",
        type: "select",
        required: true,
        helpText:
          "Most employees have a single fund. Some may split contributions across multiple funds.",
        options: ["1", "More than 1"],
      },
      {
        id: "super-split",
        label: "How should super contributions be split?",
        type: "select",
        required: true,
        options: [
          "Fixed dollar amount to each fund, remainder to primary",
          "Percentage split",
          "Not sure",
        ],
        showWhen: {
          questionId: "super-count",
          equals: ["More than 1"],
        },
      },
      {
        id: "super-sal-sacrifice",
        label:
          "Do any employees have salary sacrifice arrangements for super?",
        type: "select",
        required: true,
        helpText:
          "Salary sacrifice is where an employee chooses to put extra pre-tax money into their super fund, above the standard employer contribution.",
        options: ["Yes", "No", "Not sure"],
      },
      {
        id: "super-sal-sacrifice-end",
        label: "How is the salary sacrifice end date handled?",
        type: "select",
        required: true,
        helpText:
          "Some salary sacrifice arrangements are time-limited, others run indefinitely.",
        options: [
          "Set end date",
          "No end date — ongoing until changed",
          "Not sure",
        ],
        showWhen: {
          questionId: "super-sal-sacrifice",
          equals: ["Yes"],
        },
      },
    ],
  },
  {
    id: "leave",
    title: "Leave",
    description:
      "Help us understand your leave types and policies so we can map them between HiBob and KeyPay.",
    loomUrl: "",
    questions: [
      {
        id: "leave-types",
        label: "Which leave types does your company use?",
        type: "textarea",
        required: true,
        helpText:
          "E.g., Annual Leave, Personal/Sick Leave, Long Service Leave, Parental Leave, etc. Include any custom leave types.",
        placeholder:
          "Annual Leave, Personal Leave, Long Service Leave...",
      },
      {
        id: "leave-accrual",
        label: "How are leave balances accrued?",
        type: "select",
        required: true,
        options: [
          "Based on hours worked",
          "Fixed accrual per period",
          "Based on length of service",
          "Other",
          "Not sure",
        ],
      },
      {
        id: "leave-custom",
        label: "Do you have any custom leave policies?",
        type: "select",
        required: true,
        helpText:
          "E.g., birthday leave, wellness days, study leave, volunteer days.",
        options: ["No", "Yes"],
      },
      {
        id: "leave-custom-detail",
        label: "Describe your custom leave policies",
        type: "textarea",
        required: true,
        placeholder:
          "e.g., Birthday Leave — 1 day per year on employee's birthday...",
        showWhen: {
          questionId: "leave-custom",
          equals: ["Yes"],
        },
      },
      {
        id: "leave-balance-migration",
        label:
          "Do you need existing leave balances migrated into the integration?",
        type: "select",
        required: true,
        helpText:
          "If your employees already have accrued leave, we can set up a one-time migration of those balances. This can also be done after go-live.",
        options: ["Yes", "No", "Not sure"],
      },
    ],
  },
  {
    id: "integration-preferences",
    title: "Integration Preferences",
    description:
      "These questions help us configure the technical details of how HiBob and KeyPay will work together.",
    loomUrl: "",
    questions: [
      {
        id: "int-timesheets",
        label: "Will employees use timesheets in KeyPay?",
        type: "select",
        required: true,
        helpText:
          'KeyPay supports three timesheet modes per employee. "Always use timesheets" means hours are entered each period. "Only for exceptions" means standard hours are assumed unless changed. "Do not use timesheets" means pay is based on salary/contract.',
        options: [
          "Always use timesheets",
          "Only for exceptions",
          "Do not use timesheets",
          "Not sure — we need to discuss",
        ],
      },
      {
        id: "int-payslip",
        label:
          "Would you like KeyPay's payslip notification turned on or off?",
        type: "select",
        required: true,
        helpText:
          "Most clients turn this off because the integration copies payslips into HiBob, so employees only need to check one place. Leaving it on can cause confusion with duplicate notifications.",
        options: [
          "Off — we'll use HiBob for payslips",
          "On — send payslips from KeyPay",
          "Not sure",
        ],
      },
      {
        id: "int-terminations",
        label:
          "Should employee terminations sync automatically from HiBob to KeyPay?",
        type: "select",
        required: true,
        helpText:
          "When enabled, terminating an employee in HiBob will automatically process their termination in KeyPay.",
        options: [
          "Yes",
          "No — we'll handle terminations manually",
          "Need to discuss",
        ],
      },
      {
        id: "int-exclusions",
        label:
          "Are there any aspects of the integration you do NOT want included?",
        type: "select",
        required: true,
        options: [
          "No — include everything standard",
          "Yes — there are exclusions",
        ],
      },
      {
        id: "int-exclusions-detail",
        label: "What should be excluded?",
        type: "textarea",
        required: true,
        helpText:
          "Describe anything you'd prefer to manage manually rather than through the integration.",
        showWhen: {
          questionId: "int-exclusions",
          equals: ["Yes — there are exclusions"],
        },
      },
      {
        id: "int-third-party",
        label:
          "Are there other third-party systems you integrate (or plan to integrate) with HiBob?",
        type: "textarea",
        required: false,
        helpText:
          "E.g., Culture Amp, Deputy, Perk Box, overseas payroll systems. This helps us understand the full picture and avoid conflicts.",
        placeholder:
          "e.g., Culture Amp for engagement surveys, Deputy for rostering...",
      },
    ],
  },
  {
    id: "additional-questions",
    title: "Additional Questions & Concerns",
    description:
      "Use this section to share anything else that might be relevant, or to ask us any questions. This should take about 15-20 minutes total. You can save your progress and come back anytime.",
    loomUrl: "",
    questions: [
      {
        id: "additional-golive",
        label: "Do you have a target go-live date?",
        type: "text",
        required: false,
        helpText:
          "If you have a date in mind, let us know and we'll work backwards from there.",
        placeholder: "e.g., March 25, 2026",
      },
      {
        id: "additional-other",
        label:
          "Is there anything else you'd like us to know about your setup?",
        type: "textarea",
        required: false,
        helpText:
          "Anything that might be relevant — unusual processes, upcoming changes, concerns, etc.",
      },
      {
        id: "additional-questions",
        label:
          "Do you have any questions for us about the integration process?",
        type: "textarea",
        required: false,
        helpText:
          "No question is too small. We're here to help and will follow up on anything you raise here.",
      },
    ],
  },
];

async function seedKeypayDiscovery() {
  console.log("\n🔍 Checking for existing Standard KeyPay Discovery template...\n");

  try {
    const existing = await db
      .select({ id: discoveryTemplates.id })
      .from(discoveryTemplates)
      .where(
        and(
          eq(discoveryTemplates.name, "Standard KeyPay Discovery"),
          eq(discoveryTemplates.payrollSystem, "keypay"),
          isNull(discoveryTemplates.deletedAt)
        )
      );

    if (existing.length > 0) {
      console.log(
        `✅ Standard KeyPay Discovery template already exists (id: ${existing[0].id}), skipping.\n`
      );
      process.exit(0);
    }

    const [template] = await db
      .insert(discoveryTemplates)
      .values({
        name: "Standard KeyPay Discovery",
        payrollSystem: "keypay",
        sections: JSON.stringify(sections),
        version: 1,
        isActive: true,
      })
      .returning();

    const questionCount = sections.reduce(
      (sum, s) => sum + s.questions.length,
      0
    );

    console.log(`✅ Created "Standard KeyPay Discovery" template`);
    console.log(`   ID: ${template.id}`);
    console.log(`   Sections: ${sections.length}`);
    console.log(`   Questions: ${questionCount}`);
    console.log(`   Payroll System: keypay\n`);
  } catch (error) {
    console.error("❌ Error seeding template:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedKeypayDiscovery();
```

- [ ] **Step 2: Add npm script to package.json**

In `package.json`, add to the `"scripts"` section after the `"cleanup-users"` line:

```json
"db:seed-discovery": "tsx scripts/seed-keypay-discovery.ts"
```

- [ ] **Step 3: Run the seed script locally**

Run: `npm run db:seed-discovery`
Expected output:
```
🔍 Checking for existing Standard KeyPay Discovery template...

✅ Created "Standard KeyPay Discovery" template
   ID: <uuid>
   Sections: 6
   Questions: 30
   Payroll System: keypay
```

- [ ] **Step 4: Run it again to verify idempotency**

Run: `npm run db:seed-discovery`
Expected output:
```
🔍 Checking for existing Standard KeyPay Discovery template...

✅ Standard KeyPay Discovery template already exists (id: <uuid>), skipping.
```

- [ ] **Step 5: Verify in admin UI**

Run: `npm run dev`
Navigate to Admin Settings > Discovery Templates. Verify the "Standard KeyPay Discovery" template appears alongside the existing "test template".
Click to edit it and verify all 6 sections with questions, help text, and showWhen rules are present.

- [ ] **Step 6: Test the client flow**

Navigate to an admin project page. Start discovery using the new "Standard KeyPay Discovery" template. Then switch to the client view and verify:
- Sections render with descriptions
- Help text appears below questions
- Conditional questions are hidden when their parent is unanswered
- Selecting a triggering answer reveals the follow-up question
- Progress bar adjusts as questions become visible/hidden
- Submit validation skips hidden questions

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-keypay-discovery.ts package.json
git commit -m "$(cat <<'EOF'
feat(discovery): add Standard KeyPay Discovery template seed script

One-time script to insert the production-ready KeyPay discovery
template with 30 questions across 6 sections. Includes help text,
placeholders, and conditional visibility rules. Idempotent — safe
to run multiple times.

Usage: npm run db:seed-discovery
EOF
)"
```

---

### Task 6: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

- [ ] **Step 1: Add changelog entry**

In `src/lib/changelog.ts`, prepend a new entry at the top of the `CHANGELOG` array (after line 15, before the first existing entry):

```typescript
  {
    id: "2026-04-02-enhanced-discovery-templates",
    date: "2026-04-02",
    title: "Enhanced Discovery Templates",
    description: "Discovery questionnaires now feature help text, conditional questions, and a new Standard KeyPay template.",
    tags: ["feature"],
    audience: "all",
    items: [
      "New Standard KeyPay Discovery template with 30 guided questions across 6 sections",
      "Questions now show helpful explanations so clients can complete discovery without a call",
      "Smart conditional logic hides irrelevant follow-up questions based on your answers",
      "Loom video guide slots available per section — videos added by the DD team",
    ],
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/changelog.ts
git commit -m "$(cat <<'EOF'
docs: add changelog entry for enhanced discovery templates
EOF
)"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run the build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors.

- [ ] **Step 3: End-to-end smoke test**

Run: `npm run dev`
Verify the full flow:
1. Admin Settings > Discovery Templates — "Standard KeyPay Discovery" visible
2. Admin edits template — help text, placeholder, showWhen fields all editable
3. Admin starts discovery on a project using the new template
4. Client view — questions render with help text, conditionals work, progress bar accurate
5. Client submits — validation skips hidden questions
6. Admin review — hidden questions shown as "Not applicable" with greyed styling
7. Changelog page shows the new entry

- [ ] **Step 4: Commit any final fixes**

If any fixes were needed during verification, commit them:

```bash
git add -A
git commit -m "fix(discovery): address issues found during final verification"
```
