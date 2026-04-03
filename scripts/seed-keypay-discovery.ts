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
          "Custom fields are anything your company has added to HiBob beyond the standard fields (e.g., a custom \"Division\" or \"Cost Centre\" field).",
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
