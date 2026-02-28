import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import { eq } from "drizzle-orm";
import {
  users,
  agencies,
  clients,
  projects,
  files,
  messages,
  clientActivity,
  phaseTemplates,
  templatePhases,
  tickets,
  ticketComments,
  invites,
  integrationMonitors,
  projectPhases,
  discoveryTemplates,
  discoveryResponses,
  provisioningSteps,
  bobConfigChecklist,
  uatTemplates,
  uatResults,
  helpArticles,
} from "./schema";

const db = drizzle(sql);

// Placeholder UUID for seed data (will be replaced when real users are created)
const PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000";

// Utility to generate dates in the past
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log("Clearing existing data...");
    await db.delete(uatResults);
    await db.delete(uatTemplates);
    await db.delete(discoveryResponses);
    await db.delete(discoveryTemplates);
    await db.delete(bobConfigChecklist);
    await db.delete(provisioningSteps);
    await db.delete(ticketComments);
    await db.delete(tickets);
    await db.delete(invites);
    await db.delete(integrationMonitors);
    await db.delete(projectPhases);
    await db.delete(messages);
    await db.delete(files);
    await db.delete(clientActivity);
    await db.delete(projects);
    await db.delete(users);
    await db.delete(clients);
    await db.delete(agencies);
    await db.delete(templatePhases);
    await db.delete(phaseTemplates);
    await db.delete(helpArticles);

    console.log("✓ Cleared existing data");

    // Create agency
    const [agency] = await db
      .insert(agencies)
      .values({
        name: "Digital Directions",
        logoUrl: "https://picsum.photos/seed/digitaldirections/200/200",
        primaryColor: "#7C1CFF",
        domain: "portal.digitaldirections.com",
      })
      .returning();

    console.log(`✓ Created agency: ${agency.name}`);

    // Create default phase template
    const [template] = await db
      .insert(phaseTemplates)
      .values({
        name: "Standard HiBob Implementation",
        description: "Standard 6-phase HiBob implementation process",
        isDefault: true,
      })
      .returning();

    console.log(`✓ Created phase template: ${template.name}`);

    // Create template phases
    const phases = [
      { name: "Project Discovery & Provisioning", description: "Initial project setup and requirements gathering", orderIndex: 0, estimatedDays: 5, color: "#7C1CFF" },
      { name: "Integration Build", description: "Build and configure HiBob integrations", orderIndex: 1, estimatedDays: 10, color: "#7C1CFF" },
      { name: "Internal Testing", description: "Internal QA and testing of integrations", orderIndex: 2, estimatedDays: 5, color: "#7C1CFF" },
      { name: "UAT", description: "User Acceptance Testing with client", orderIndex: 3, estimatedDays: 7, color: "#7C1CFF" },
      { name: "Go Live Preparation", description: "Final preparations before production launch", orderIndex: 4, estimatedDays: 3, color: "#7C1CFF" },
      { name: "Go Live", description: "Production launch and monitoring", orderIndex: 5, estimatedDays: 1, color: "#7C1CFF" },
    ];

    for (const phase of phases) {
      await db.insert(templatePhases).values({
        templateId: template.id,
        ...phase,
      });
    }

    console.log(`✓ Created ${phases.length} template phases`);

    // Create a placeholder admin user for seed data
    await db.insert(users).values({
      id: PLACEHOLDER_USER_ID,
      clerkId: "placeholder_clerk_id",
      role: "admin",
      agencyId: agency.id,
      clientId: null,
    });

    console.log("✓ Created placeholder admin user");

    // Create realistic clients
    const clientsData = [
      {
        companyName: "Meridian Healthcare",
        contactName: "Sarah Johnson",
        contactEmail: "sarah.johnson@meridianhc.com",
        status: "active" as const,
      },
      {
        companyName: "TechCorp Solutions",
        contactName: "Michael Chen",
        contactEmail: "michael.chen@techcorp.io",
        status: "active" as const,
      },
      {
        companyName: "GreenLeaf Retail",
        contactName: "Emily Rodriguez",
        contactEmail: "emily.r@greenleaf.com",
        status: "active" as const,
      },
      {
        companyName: "Summit Financial",
        contactName: "David Park",
        contactEmail: "david.park@summitfin.com",
        status: "active" as const,
      },
      {
        companyName: "BlueSky Manufacturing",
        contactName: "Jennifer Lee",
        contactEmail: "jen.lee@bluesky.com",
        status: "active" as const,
      },
      {
        companyName: "Apex Logistics",
        contactName: "Robert Williams",
        contactEmail: "rob.w@apexlogistics.com",
        status: "inactive" as const,
      },
    ];

    const insertedClients = await db
      .insert(clients)
      .values(
        clientsData.map((c) => ({
          ...c,
          agencyId: agency.id,
        }))
      )
      .returning();

    console.log(`✓ Created ${insertedClients.length} clients`);

    // Create client activity records
    for (const client of insertedClients.slice(0, 4)) {
      await db.insert(clientActivity).values({
        clientId: client.id,
        lastLogin: daysAgo(Math.floor(Math.random() * 7)),
        lastMessageSent: daysAgo(Math.floor(Math.random() * 3)),
        lastFileDownloaded: daysAgo(Math.floor(Math.random() * 5)),
      });
    }

    console.log("✓ Created client activity records");

    // Create projects for each client
    const projectsData: Array<{
      clientId: string;
      name: string;
      description: string;
      status: "planning" | "in_progress" | "review" | "completed" | "on_hold";
      currentStage: "pre_sales" | "discovery" | "provisioning" | "bob_config" | "mapping" | "build" | "uat" | "go_live" | "support";
      payrollSystem: "keypay" | "myob" | "deputy" | "generic";
      startDate: Date;
      dueDate: Date | null;
    }> = [];

    // Meridian Healthcare projects
    projectsData.push(
      {
        clientId: insertedClients[0].id,
        name: "HiBob Payroll Integration",
        description: "Integrate HiBob with NetSuite for automated payroll processing",
        status: "in_progress",
        currentStage: "build",
        payrollSystem: "keypay",
        startDate: daysAgo(45),
        dueDate: daysAgo(-15),
      },
      {
        clientId: insertedClients[0].id,
        name: "Benefits Enrollment Portal",
        description: "Custom employee benefits enrollment through HiBob",
        status: "review",
        currentStage: "uat",
        payrollSystem: "keypay",
        startDate: daysAgo(30),
        dueDate: daysAgo(-5),
      }
    );

    // TechCorp Solutions projects
    projectsData.push(
      {
        clientId: insertedClients[1].id,
        name: "Time Tracking Implementation",
        description: "Deploy HiBob time tracking module across all departments",
        status: "in_progress",
        currentStage: "mapping",
        payrollSystem: "keypay",
        startDate: daysAgo(60),
        dueDate: daysAgo(-20),
      },
      {
        clientId: insertedClients[1].id,
        name: "Workato Recipe Optimization",
        description: "Optimize existing Workato recipes for performance",
        status: "completed",
        currentStage: "support",
        payrollSystem: "keypay",
        startDate: daysAgo(90),
        dueDate: daysAgo(10),
      }
    );

    // GreenLeaf Retail projects
    projectsData.push(
      {
        clientId: insertedClients[2].id,
        name: "Employee Onboarding Automation",
        description: "Automate new hire workflows with HiBob and Workato",
        status: "in_progress",
        currentStage: "build",
        payrollSystem: "keypay",
        startDate: daysAgo(20),
        dueDate: daysAgo(-30),
      },
      {
        clientId: insertedClients[2].id,
        name: "Performance Review System",
        description: "Implement quarterly performance review process",
        status: "planning",
        currentStage: "discovery",
        payrollSystem: "keypay",
        startDate: daysAgo(5),
        dueDate: null,
      }
    );

    // Summit Financial projects
    projectsData.push(
      {
        clientId: insertedClients[3].id,
        name: "Compliance Reporting Dashboard",
        description: "Build custom compliance reports from HiBob data",
        status: "in_progress",
        currentStage: "build",
        payrollSystem: "keypay",
        startDate: daysAgo(75),
        dueDate: daysAgo(-10),
      },
      {
        clientId: insertedClients[3].id,
        name: "Deputy Integration",
        description: "Connect HiBob with Deputy for leave and shift management",
        status: "completed",
        currentStage: "support",
        payrollSystem: "keypay",
        startDate: daysAgo(120),
        dueDate: daysAgo(20),
      },
      {
        clientId: insertedClients[3].id,
        name: "Multi-Country Payroll Setup",
        description: "Configure HiBob for operations in 5 countries",
        status: "review",
        currentStage: "uat",
        payrollSystem: "keypay",
        startDate: daysAgo(40),
        dueDate: daysAgo(-8),
      }
    );

    // BlueSky Manufacturing projects
    projectsData.push(
      {
        clientId: insertedClients[4].id,
        name: "Shift Scheduling Module",
        description: "Implement shift scheduling for factory workers",
        status: "planning",
        currentStage: "discovery",
        payrollSystem: "keypay",
        startDate: daysAgo(10),
        dueDate: null,
      }
    );

    const insertedProjects = await db.insert(projects).values(projectsData).returning();

    console.log(`✓ Created ${insertedProjects.length} projects`);

    // Apply phase template to active projects and create project phases
    let totalPhases = 0;
    for (const project of insertedProjects.filter((p) => p.status !== "planning")) {
      const templatePhasesData = await db
        .select()
        .from(templatePhases)
        .where(eq(templatePhases.templateId, template.id))
        .orderBy(templatePhases.orderIndex);

      for (let i = 0; i < templatePhasesData.length; i++) {
        const tPhase = templatePhasesData[i];
        let status: "pending" | "in_progress" | "completed" | "skipped" = "pending";
        let startedAt: Date | null = null;
        let completedAt: Date | null = null;

        if (project.status === "completed") {
          status = "completed";
          startedAt = daysAgo(90 - i * 10);
          completedAt = daysAgo(85 - i * 10);
        } else if (project.status === "in_progress") {
          if (i < 2) {
            status = "completed";
            startedAt = daysAgo(50 - i * 8);
            completedAt = daysAgo(45 - i * 8);
          } else if (i === 2) {
            status = "in_progress";
            startedAt = daysAgo(10);
          }
        } else if (project.status === "review") {
          if (i < 4) {
            status = "completed";
            startedAt = daysAgo(60 - i * 10);
            completedAt = daysAgo(55 - i * 10);
          } else if (i === 4) {
            status = "in_progress";
            startedAt = daysAgo(5);
          }
        }

        await db.insert(projectPhases).values({
          projectId: project.id,
          name: tPhase.name,
          description: tPhase.description,
          orderIndex: tPhase.orderIndex,
          status,
          startedAt,
          completedAt,
        });

        totalPhases++;
      }
    }

    console.log(`✓ Created ${totalPhases} project phases`);

    // Create integration monitors
    const integrationData = [
      // Meridian Healthcare — HiBob + NetSuite + Workato
      { projectId: insertedProjects[0].id, clientId: insertedClients[0].id, serviceType: "hibob" as const, serviceName: "HiBob HR Platform" },
      { projectId: insertedProjects[0].id, clientId: insertedClients[0].id, serviceType: "netsuite" as const, serviceName: "NetSuite ERP" },
      { projectId: insertedProjects[1].id, clientId: insertedClients[0].id, serviceType: "workato" as const, serviceName: "Workato Automation" },
      // TechFlow Solutions — HiBob + KeyPay
      { projectId: insertedProjects[2].id, clientId: insertedClients[1].id, serviceType: "hibob" as const, serviceName: "HiBob Time Tracking" },
      { projectId: insertedProjects[2].id, clientId: insertedClients[1].id, serviceType: "keypay" as const, serviceName: "KeyPay Payroll" },
      // GreenLeaf Retail — Workato + MYOB
      { projectId: insertedProjects[4].id, clientId: insertedClients[2].id, serviceType: "workato" as const, serviceName: "Workato Workflows" },
      { projectId: insertedProjects[4].id, clientId: insertedClients[2].id, serviceType: "myob" as const, serviceName: "MYOB Payroll" },
      // Summit Financial — Deputy + HiBob
      { projectId: insertedProjects[6].id, clientId: insertedClients[3].id, serviceType: "deputy" as const, serviceName: "Deputy Scheduling" },
      { projectId: insertedProjects[6].id, clientId: insertedClients[3].id, serviceType: "hibob" as const, serviceName: "HiBob Core" },
    ];

    const insertedIntegrations = await db.insert(integrationMonitors).values(
      integrationData.map((i) => ({
        ...i,
        isEnabled: true,
        checkIntervalMinutes: 5,
        currentStatus: "healthy" as const,
        platformStatusUrl: i.serviceType === "hibob" ? "https://status.hibob.io" : null,
        checkPlatformStatus: true,
        alertEnabled: true,
        alertThresholdMinutes: 15,
      }))
    ).returning();

    console.log(`✓ Created ${insertedIntegrations.length} integration monitors`);

    // Create tickets
    const ticketsData = [
      { clientId: insertedClients[0].id, projectId: insertedProjects[0].id, title: "API timeout in payroll sync", description: "Intermittent timeouts when syncing payroll data to NetSuite during peak hours", type: "bug_report" as const, priority: "high" as const, status: "in_progress" as const, createdAt: daysAgo(5) },
      { clientId: insertedClients[0].id, projectId: insertedProjects[1].id, title: "Employee import CSV error", description: "Getting validation errors when importing employees via CSV", type: "bug_report" as const, priority: "medium" as const, status: "resolved" as const, createdAt: daysAgo(12) },
      { clientId: insertedClients[0].id, projectId: null, title: "Request for custom reports", description: "Need custom reports for headcount by department", type: "feature_request" as const, priority: "low" as const, status: "open" as const, createdAt: daysAgo(2) },

      { clientId: insertedClients[1].id, projectId: insertedProjects[2].id, title: "Time tracking mobile app issue", description: "Employees can't clock in via mobile app", type: "bug_report" as const, priority: "urgent" as const, status: "in_progress" as const, createdAt: daysAgo(1) },
      { clientId: insertedClients[1].id, projectId: insertedProjects[3].id, title: "Recipe performance degradation", description: "Workato recipes running slower than expected", type: "project_issue" as const, priority: "medium" as const, status: "closed" as const, createdAt: daysAgo(45) },
      { clientId: insertedClients[1].id, projectId: null, title: "Training session request", description: "Need training for new HR staff on HiBob", type: "general_support" as const, priority: "low" as const, status: "waiting_on_client" as const, createdAt: daysAgo(8) },

      { clientId: insertedClients[2].id, projectId: insertedProjects[4].id, title: "Onboarding workflow not triggering", description: "New hire onboarding automation stopped working", type: "bug_report" as const, priority: "high" as const, status: "resolved" as const, createdAt: daysAgo(15) },
      { clientId: insertedClients[2].id, projectId: null, title: "Question about permissions", description: "How to set up department-specific permissions?", type: "general_support" as const, priority: "low" as const, status: "closed" as const, createdAt: daysAgo(20) },

      { clientId: insertedClients[3].id, projectId: insertedProjects[6].id, title: "Compliance report formatting", description: "Need to adjust formatting on quarterly compliance reports", type: "project_issue" as const, priority: "medium" as const, status: "in_progress" as const, createdAt: daysAgo(7) },
      { clientId: insertedClients[3].id, projectId: insertedProjects[7].id, title: "Deputy integration complete", description: "Confirming successful completion of Deputy integration", type: "general_support" as const, priority: "low" as const, status: "closed" as const, createdAt: daysAgo(30) },
      { clientId: insertedClients[3].id, projectId: null, title: "Add new country payroll", description: "Need to add Germany to multi-country payroll setup", type: "feature_request" as const, priority: "medium" as const, status: "open" as const, createdAt: daysAgo(3) },

      { clientId: insertedClients[4].id, projectId: insertedProjects[9].id, title: "Shift scheduling requirements", description: "Discussion of requirements for shift scheduling", type: "project_issue" as const, priority: "medium" as const, status: "waiting_on_client" as const, createdAt: daysAgo(4) },
    ];

    const insertedTickets = await db.insert(tickets).values(
      ticketsData.map((t) => ({
        ...t,
        createdBy: PLACEHOLDER_USER_ID,
      }))
    ).returning();

    console.log(`✓ Created ${insertedTickets.length} tickets`);

    // Create ticket comments
    const commentsData = [
      { ticketId: insertedTickets[0].id, authorId: PLACEHOLDER_USER_ID, content: "I've identified the root cause - it's a connection pool exhaustion issue during peak load.", isInternal: true, createdAt: daysAgo(4) },
      { ticketId: insertedTickets[0].id, authorId: PLACEHOLDER_USER_ID, content: "We've implemented a fix and are testing in staging. Should be ready for production tomorrow.", isInternal: false, createdAt: daysAgo(3) },

      { ticketId: insertedTickets[1].id, authorId: PLACEHOLDER_USER_ID, content: "The issue was incorrect date formatting in the CSV. Updated documentation with correct format.", isInternal: false, createdAt: daysAgo(11) },

      { ticketId: insertedTickets[3].id, authorId: PLACEHOLDER_USER_ID, content: "URGENT: Investigating mobile app clock-in issue. ETA 2 hours.", isInternal: true, createdAt: daysAgo(1) },

      { ticketId: insertedTickets[6].id, authorId: PLACEHOLDER_USER_ID, content: "Fixed the workflow trigger. It was a permissions issue with the service account.", isInternal: false, createdAt: daysAgo(14) },

      { ticketId: insertedTickets[8].id, authorId: PLACEHOLDER_USER_ID, content: "Working on the compliance report formatting. Will send updated template by end of day.", isInternal: false, createdAt: daysAgo(6) },
    ];

    await db.insert(ticketComments).values(commentsData);

    console.log(`✓ Created ${commentsData.length} ticket comments`);

    // Create messages
    const messagesData = [];
    for (const project of insertedProjects.slice(0, 6)) {
      messagesData.push(
        {
          projectId: project.id,
          senderId: PLACEHOLDER_USER_ID,
          content: "Project kickoff scheduled for next week. Looking forward to working with you!",
          read: true,
          createdAt: daysAgo(Math.floor(Math.random() * 60) + 30),
        },
        {
          projectId: project.id,
          senderId: PLACEHOLDER_USER_ID,
          content: "Quick update: We've completed the initial configuration and are moving into testing phase.",
          read: Math.random() > 0.5,
          createdAt: daysAgo(Math.floor(Math.random() * 30) + 10),
        },
        {
          projectId: project.id,
          senderId: PLACEHOLDER_USER_ID,
          content: "Please review the latest changes and let us know if you have any questions.",
          read: Math.random() > 0.5,
          createdAt: daysAgo(Math.floor(Math.random() * 10)),
        }
      );
    }

    await db.insert(messages).values(messagesData);

    console.log(`✓ Created ${messagesData.length} messages`);

    // Create files
    const filesData = [];
    for (let i = 0; i < 10; i++) {
      const project = insertedProjects[i % insertedProjects.length];
      const fileNames = [
        "Employee_Import_Template.xlsx",
        "Payroll_Configuration.pdf",
        "Integration_Diagram.png",
        "User_Guide_v2.docx",
        "API_Documentation.pdf",
        "Test_Results.xlsx",
        "Compliance_Report_Q4.pdf",
        "Training_Materials.pptx",
        "System_Architecture.pdf",
        "Requirements_Doc.docx",
      ];

      filesData.push({
        projectId: project.id,
        name: fileNames[i],
        fileUrl: `https://utfs.io/f/example-${i}.pdf`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        fileType: fileNames[i].split('.').pop() || 'pdf',
        uploadedBy: PLACEHOLDER_USER_ID,
        uploadedAt: daysAgo(Math.floor(Math.random() * 30)),
      });
    }

    await db.insert(files).values(filesData);

    console.log(`✓ Created ${filesData.length} files`);

    // Seed KeyPay Discovery Template
    const keypayDiscoverySections = [
      {
        id: "org-info",
        title: "Organisation Information",
        description: "Tell us about your company structure so we can configure HiBob correctly for your organisation.",
        loomUrl: "",
        questions: [
          { id: "org-legal-name", label: "Company legal name", type: "text", required: true },
          { id: "org-trading-name", label: "Trading name (if different)", type: "text", required: false },
          { id: "org-abn", label: "ABN", type: "text", required: true },
          { id: "org-employee-count", label: "Total number of employees", type: "number", required: true },
          { id: "org-locations", label: "How many office locations do you have?", type: "number", required: true },
          { id: "org-location-names", label: "List your office location names", type: "textarea", required: true },
          { id: "org-departments", label: "List your departments", type: "textarea", required: true },
          { id: "org-entities", label: "Do you have multiple legal entities?", type: "select", required: true, options: ["No — single entity", "Yes — 2 entities", "Yes — 3+ entities"] },
          { id: "org-countries", label: "Which countries do you operate in?", type: "textarea", required: true },
        ],
      },
      {
        id: "payroll-config",
        title: "Payroll Configuration",
        description: "Help us understand your current payroll setup so we can configure the integration correctly.",
        loomUrl: "",
        questions: [
          { id: "pay-frequency", label: "Pay frequency", type: "select", required: true, options: ["Weekly", "Fortnightly", "Monthly", "Twice monthly"] },
          { id: "pay-day", label: "What day of the week/month do you pay?", type: "text", required: true },
          { id: "pay-current-system", label: "What payroll system are you currently using?", type: "text", required: true },
          { id: "pay-keypay-setup", label: "Is your KeyPay (Employment Hero) account already set up?", type: "select", required: true, options: ["Yes — fully configured", "Yes — partially configured", "No — not yet set up"] },
          { id: "pay-award-rates", label: "Do you use award/agreement rates?", type: "select", required: true, options: ["Yes", "No", "Some employees"] },
          { id: "pay-categories-custom", label: "Do you have custom pay categories (e.g. allowances, deductions)?", type: "select", required: true, options: ["Yes", "No"] },
          { id: "pay-categories-list", label: "If yes, list your custom pay categories", type: "textarea", required: false },
        ],
      },
      {
        id: "leave-management",
        title: "Leave Management",
        description: "Tell us about the leave types and policies you use so we can map them correctly.",
        loomUrl: "",
        questions: [
          { id: "leave-types", label: "Which leave types do you use? (e.g. Annual, Personal, Long Service, etc.)", type: "textarea", required: true },
          { id: "leave-accrual", label: "How are leave balances accrued?", type: "select", required: true, options: ["Based on hours worked", "Fixed accrual per period", "Based on service length", "Other"] },
          { id: "leave-custom-policies", label: "Do you have custom leave policies (e.g. birthday leave, wellness days)?", type: "select", required: true, options: ["Yes", "No"] },
          { id: "leave-custom-list", label: "If yes, describe your custom leave policies", type: "textarea", required: false },
          { id: "leave-existing-balances", label: "Do you need to migrate existing leave balances?", type: "select", required: true, options: ["Yes", "No"] },
          { id: "leave-approval-flow", label: "Describe your leave approval workflow", type: "textarea", required: false },
        ],
      },
      {
        id: "banking-super",
        title: "Banking & Superannuation",
        description: "We need to understand your banking and superannuation setup to configure payment splits correctly.",
        loomUrl: "",
        questions: [
          { id: "bank-account-count", label: "How many bank accounts do employees typically have?", type: "select", required: true, options: ["1", "2", "3 or more"] },
          { id: "bank-split-method", label: "How are bank account splits configured?", type: "select", required: true, options: ["Percentage", "Fixed dollar amount", "Remaining balance", "Mix of methods"] },
          { id: "super-fund-types", label: "Which super fund types do you use?", type: "select", required: true, options: ["Regular only", "Regular + SMSF", "Regular + SMSF + Employer", "Other"] },
          { id: "super-fund-selector", label: "Do employees choose their own super fund?", type: "select", required: true, options: ["Yes — employee choice", "No — company default fund", "Mix of both"] },
          { id: "super-salary-sacrifice", label: "Do any employees have salary sacrifice arrangements?", type: "select", required: true, options: ["Yes", "No"] },
          { id: "super-additional-notes", label: "Any additional notes about your superannuation setup?", type: "textarea", required: false },
        ],
      },
      {
        id: "integration-requirements",
        title: "Integration Requirements",
        description: "Help us understand your specific integration needs and preferences.",
        loomUrl: "",
        questions: [
          { id: "int-sync-direction", label: "Sync direction preference", type: "select", required: true, options: ["HiBob → KeyPay (one-way)", "Bi-directional", "Not sure — need advice"] },
          { id: "int-sync-frequency", label: "How often should data sync?", type: "select", required: true, options: ["Real-time (webhook)", "Every few hours", "Daily", "Not sure — need advice"] },
          { id: "int-employee-fields", label: "Which employee fields need to sync? (e.g. name, address, bank details, tax, super)", type: "textarea", required: true },
          { id: "int-custom-fields", label: "Do you have custom fields in HiBob that need to sync?", type: "select", required: true, options: ["Yes", "No", "Not sure"] },
          { id: "int-custom-fields-list", label: "If yes, list your custom fields", type: "textarea", required: false },
          { id: "int-onboard-offboard", label: "Should new hires and terminations sync automatically?", type: "select", required: true, options: ["Yes — both", "New hires only", "Terminations only", "No — manual process"] },
          { id: "int-go-live-date", label: "Do you have a target go-live date?", type: "text", required: false },
          { id: "int-additional-requirements", label: "Any other integration requirements or concerns?", type: "textarea", required: false },
        ],
      },
    ];

    const [keypayTemplate] = await db.insert(discoveryTemplates).values({
      name: "Standard KeyPay Discovery",
      payrollSystem: "keypay",
      sections: JSON.stringify(keypayDiscoverySections),
      version: 1,
      isActive: true,
    }).returning();

    console.log(`✓ Created KeyPay discovery template: ${keypayTemplate.name}`);

    // ─── Provisioning Steps ───────────────────────────────────────────────────
    // Add provisioning steps to the TechCorp "Time Tracking Implementation" project
    // (in mapping stage — provisioning already fully completed as a demo)
    const techCorpMappingProject = insertedProjects.find(
      (p) => p.name === "Time Tracking Implementation"
    );

    // Also add to Meridian "HiBob Payroll Integration" (in build — partially done)
    const meridianBuildProject = insertedProjects.find(
      (p) => p.name === "HiBob Payroll Integration"
    );

    const hibobStepContent = JSON.stringify({
      intro:
        "Your Digital Directions Integration Specialist will require administrative access to your HiBob Production environment. Once granted, they can access your Sandbox environment. This process should take 10–15 minutes.",
      steps: [
        "Login to your HiBob Production environment.",
        "Navigate to Org → People, then click New Hire to open the \"Add new hire to Bob\" popup.",
        "Choose your onboarding template. Enter the following details carefully:\n  • Email: firstname+yourclientdomain@digitaldirections.io (use .io — not .com)\n  • First name / Last name: as provided by your DD Integration Specialist\n  • Start date: Set in the past so the account is accessible immediately\n  • Ensure \"Invite employee\" is turned on before completing",
        "Click the grid icon (top left) → System Settings → expand Account → select Permission Groups → click the Admin row.",
        "Under Admins, open Group actions → Edit details → click Edit under Members.",
        "Search for the employee you just created, click their row to add them to Selected, then click Select → Save → Confirm.",
      ],
      revokeNote:
        "Navigate to Org → People, find the specialist, click Actions → Manage access → Delete employee profile, type DELETE to confirm.",
    });

    const keypayStepContent = JSON.stringify({
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
    });

    const workatoStepContent = JSON.stringify({
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
    });

    if (techCorpMappingProject) {
      // Fully verified steps (project is past provisioning stage)
      await db.insert(provisioningSteps).values([
        {
          projectId: techCorpMappingProject.id,
          stepKey: "hibob",
          title: "HiBob",
          description: hibobStepContent,
          orderIndex: 1,
          completedAt: daysAgo(50),
          verifiedAt: daysAgo(49),
        },
        {
          projectId: techCorpMappingProject.id,
          stepKey: "keypay",
          title: "Employment Hero Payroll (KeyPay)",
          description: keypayStepContent,
          orderIndex: 2,
          completedAt: daysAgo(50),
          verifiedAt: daysAgo(49),
        },
        {
          projectId: techCorpMappingProject.id,
          stepKey: "workato",
          title: "Workato",
          description: workatoStepContent,
          orderIndex: 3,
          completedAt: daysAgo(49),
          verifiedAt: daysAgo(48),
        },
      ]);
      console.log(`✓ Created fully verified provisioning steps for ${techCorpMappingProject.name}`);
    }

    if (meridianBuildProject) {
      // Partially verified steps (hibob done, keypay awaiting verification, workato not started)
      await db.insert(provisioningSteps).values([
        {
          projectId: meridianBuildProject.id,
          stepKey: "hibob",
          title: "HiBob",
          description: hibobStepContent,
          orderIndex: 1,
          completedAt: daysAgo(42),
          verifiedAt: daysAgo(41),
        },
        {
          projectId: meridianBuildProject.id,
          stepKey: "keypay",
          title: "Employment Hero Payroll (KeyPay)",
          description: keypayStepContent,
          orderIndex: 2,
          completedAt: daysAgo(40),
          verifiedAt: null,
        },
        {
          projectId: meridianBuildProject.id,
          stepKey: "workato",
          title: "Workato",
          description: workatoStepContent,
          orderIndex: 3,
          completedAt: null,
          verifiedAt: null,
        },
      ]);
      console.log(`✓ Created partial provisioning steps for ${meridianBuildProject.name}`);
    }

    // ─── Bob Config Checklist ─────────────────────────────────────────────────
    // Add a bob config checklist to TechCorp project (approved, since they're in mapping)
    if (techCorpMappingProject) {
      const bobConfigItems = [
        {
          id: "bc-seed-1",
          title: "Organisation Units (Departments)",
          description:
            "Ensure your departments and org structure in HiBob matches how your payroll system categorises employees.",
          loomUrl: null,
          faqItems: [
            {
              question: "What if my departments don't match my payroll categories?",
              answer:
                "Work with your DD Integration Specialist to create a mapping between HiBob departments and your payroll categories.",
            },
          ],
          completedAt: daysAgo(45).toISOString(),
        },
        {
          id: "bc-seed-2",
          title: "Leave Types",
          description:
            "Review and confirm all leave types are configured in HiBob (e.g. Annual Leave, Sick Leave, Long Service Leave).",
          loomUrl: null,
          faqItems: [
            {
              question: "How many leave types do we need?",
              answer:
                "Set up all leave types your employees use. Unused leave types can be hidden from employees.",
            },
          ],
          completedAt: daysAgo(45).toISOString(),
        },
        {
          id: "bc-seed-3",
          title: "Employee Profiles & Fields",
          description:
            "Verify that all required employee fields are populated in HiBob: employment type, work location, pay rate type, and start date.",
          loomUrl: null,
          faqItems: [],
          completedAt: daysAgo(44).toISOString(),
        },
        {
          id: "bc-seed-4",
          title: "Pay Groups & Pay Calendars",
          description:
            "Confirm your pay groups and pay calendars are set up correctly in HiBob.",
          loomUrl: null,
          faqItems: [],
          completedAt: daysAgo(44).toISOString(),
        },
        {
          id: "bc-seed-5",
          title: "Work Locations",
          description:
            "Ensure all work locations are configured in HiBob and assigned to the correct employees.",
          loomUrl: null,
          faqItems: [],
          completedAt: daysAgo(43).toISOString(),
        },
        {
          id: "bc-seed-6",
          title: "Custom Fields Review",
          description:
            "Review any custom fields configured in HiBob that are relevant to the integration.",
          loomUrl: null,
          faqItems: [],
          completedAt: daysAgo(43).toISOString(),
        },
      ];

      await db.insert(bobConfigChecklist).values({
        projectId: techCorpMappingProject.id,
        items: JSON.stringify(bobConfigItems),
        status: "approved",
        submittedAt: daysAgo(43),
        approvedAt: daysAgo(42),
      });
      console.log(`✓ Created approved bob config checklist for ${techCorpMappingProject.name}`);
    }

    // ─── UAT Templates ───────────────────────────────────────────────────────
    const keypayUatScenarios = [
      {
        id: "uat-employee-upsert",
        title: "Employee Upsert",
        description: "Create or update an employee in HiBob and verify the changes flow through to your payroll system (Employment Hero / KeyPay).",
        loomUrl: "",
        steps: [
          "Open HiBob and create a new test employee (or update an existing one) with a unique name you can easily identify.",
          "Fill in the required fields: name, email, start date, department, and work location.",
          "Wait 2–3 minutes for the sync to process.",
          "Log in to Employment Hero (KeyPay) and search for the employee by name.",
          "Verify the employee record exists and all synced fields match what you entered in HiBob.",
        ],
      },
      {
        id: "uat-leave-sync",
        title: "Leave Request Sync",
        description: "Submit and cancel a leave request in HiBob and verify it flows correctly to your payroll system.",
        loomUrl: "",
        steps: [
          "In HiBob, navigate to the test employee's profile and submit a new leave request (e.g. 1 day of Annual Leave).",
          "Approve the leave request in HiBob (you may need manager/admin access).",
          "Wait 2–3 minutes for the sync to process.",
          "In Employment Hero (KeyPay), check the employee's leave requests and verify the approved leave appears.",
          "Back in HiBob, cancel the same leave request.",
          "Wait 2–3 minutes, then verify the cancellation is reflected in Employment Hero.",
        ],
      },
      {
        id: "uat-payslip-upload",
        title: "Pay Slip Upload",
        description: "Run a payroll in your payroll system and verify pay slips flow back to HiBob.",
        loomUrl: "",
        steps: [
          "In Employment Hero (KeyPay), run a test pay run that includes the test employee.",
          "Finalise the pay run so pay slips are generated.",
          "Wait 5–10 minutes for the pay slip sync to process.",
          "In HiBob, navigate to the test employee's Payroll section.",
          "Verify the pay slip appears with the correct pay period and amounts.",
        ],
      },
    ];

    const [keypayUatTemplate] = await db.insert(uatTemplates).values({
      name: "Standard KeyPay UAT",
      payrollSystem: "keypay",
      scenarios: JSON.stringify(keypayUatScenarios),
      isActive: true,
    }).returning();

    console.log(`✓ Created KeyPay UAT template: ${keypayUatTemplate.name} (${keypayUatScenarios.length} scenarios)`);

    // ── Help Articles (Digi AI Knowledge Base) ──────────────────────────
    const helpArticlesData = [
      {
        title: "Getting Started with the DD Portal",
        slug: "getting-started",
        content: `Welcome to the Digital Directions Portal! This is your central hub for managing your HiBob integration project.

After logging in, you'll see your dashboard with an overview of your active projects, recent activity, and any outstanding items that need your attention.

Use the sidebar to navigate between sections:
- **Dashboard** — Your project overview and key metrics
- **Projects** — View detailed progress on each integration project
- **Support** — Contact the Digital Directions team for help
- **Messages** — Communicate with the Digital Directions team

Each project page shows your current lifecycle stage, uploaded files, messages, and integration health status. You can track exactly where your project is at any time.`,
        category: "portal",
        publishedAt: new Date(),
      },
      {
        title: "Understanding Your Project Dashboard",
        slug: "project-dashboard",
        content: `Your project dashboard provides a real-time view of your HiBob integration progress.

At the top of each project page, you'll see the **lifecycle stage indicator** showing which of the 9 stages your project is currently in. Completed stages are marked with a tick, and your current stage is highlighted.

Key sections on your project page:
- **Project Details** — Your project name, payroll system, start date, and due date
- **Files** — Documents shared between your team and Digital Directions
- **Messages** — Direct communication channel with the DD team
- **Integration Health** — Live status of connected services (HiBob, payroll, Workato)

If you see any flags or action items, these indicate something needs your attention — such as completing a questionnaire or reviewing a data mapping.`,
        category: "portal",
        publishedAt: new Date(),
      },
      {
        title: "How to Get Support",
        slug: "getting-support",
        content: `If you need help or have an issue, the Digital Directions team is here for you.

**Chat with Digi first**
Digi is our AI assistant available from the chat bubble in the bottom-right corner. Digi can answer most questions instantly — from project status to integration help. Start here for the fastest response.

**Email the support team**
For issues Digi can't resolve, email us directly at support@digitaldirections-help.freshdesk.com. We respond within 4 business hours.

**Tips for faster resolution:**
- Include specific details (employee names, dates, error messages)
- Attach screenshots if relevant
- Describe the business impact so we can prioritise appropriately
- For urgent payroll-critical issues, mention that clearly in your email subject line`,
        category: "portal",
        publishedAt: new Date(),
      },
      {
        title: "The 9 Stages of Your Integration Project",
        slug: "nine-integration-stages",
        content: `Every HiBob integration project at Digital Directions follows a proven 9-stage lifecycle:

1. **Pre-Sales** — We scope out your requirements and prepare a proposal.
2. **Discovery** — You complete a questionnaire about your organisation, payroll setup, and integration needs.
3. **System Provisioning** — You grant our team access to HiBob, your payroll system, and Workato.
4. **HiBob Configuration** — You confirm your HiBob setup (departments, leave types, employee fields) is ready for integration.
5. **Data Mapping** — You map your HiBob values to the corresponding payroll system values (leave types, locations, pay categories).
6. **Integration Build** — Our team builds and configures the Workato recipes that sync your data.
7. **User Acceptance Testing (UAT)** — You test the integration with real data and confirm everything works correctly.
8. **Go-Live** — We switch the integration to production. Your data starts syncing automatically.
9. **Ongoing Support** — We monitor and maintain your integration with a support package.

Your current stage is always visible on your project dashboard. Each stage has specific tasks and milestones — the portal will guide you through what to do at each step.`,
        category: "lifecycle",
        publishedAt: new Date(),
      },
      {
        title: "Completing the Discovery Questionnaire",
        slug: "discovery-questionnaire",
        content: `The Discovery stage is one of the most important steps in your integration project. This is where we learn about your organisation's specific setup and requirements.

During Discovery, you'll receive a questionnaire covering:
- **Company details** — Your organisational structure, locations, and departments
- **Payroll setup** — How your payroll system is configured, pay frequencies, and special requirements
- **Employee data** — Which fields you need synced between HiBob and payroll
- **Leave management** — Your leave types, approval workflows, and any custom leave policies
- **Banking and superannuation** — How employee payment details should be mapped

Tips for completing the questionnaire:
- Answer as thoroughly as possible — the more detail you provide, the smoother the build phase will be
- If you're unsure about a question, make a note and our team will help clarify
- You can save your progress and come back later
- Once submitted, our team will review your responses and may follow up with questions

After your responses are approved, we'll move to System Provisioning.`,
        category: "lifecycle",
        publishedAt: new Date(),
      },
      {
        title: "What Happens During UAT",
        slug: "uat-testing",
        content: `User Acceptance Testing (UAT) is your chance to verify that the integration works correctly before going live.

During UAT, you'll test scenarios such as:
- **Employee sync** — Create or update an employee in HiBob and verify the data appears correctly in your payroll system
- **Leave requests** — Submit leave in HiBob and confirm it syncs to payroll
- **Banking details** — Update bank account information and verify it flows through
- **Payroll processing** — Run a test payroll cycle to check everything calculates correctly

How to complete UAT:
1. We'll provide you with a set of test scenarios in the portal
2. Follow each scenario step by step
3. Mark each test as passed or failed
4. If a test fails, add notes describing what went wrong
5. Our team will investigate and fix any issues
6. Re-test failed scenarios after fixes are applied

UAT typically takes 1-2 weeks depending on the complexity of your integration. We recommend testing with real employee data (in a sandbox environment) for the most accurate results.`,
        category: "lifecycle",
        publishedAt: new Date(),
      },
      {
        title: "How HiBob Connects to Your Payroll System",
        slug: "hibob-payroll-connection",
        content: `Digital Directions uses Workato, an enterprise integration platform, to connect HiBob with your payroll system. Here's a simplified overview of how it works.

**What gets synced:**
- **Employee data** — New hires, updates to personal details, terminations
- **Leave requests** — Approved leave from HiBob flows to payroll automatically
- **Banking details** — Employee bank account information for payroll processing
- **Superannuation** — Super fund details and contribution settings

**How the sync works:**
1. When a change is made in HiBob (e.g., a new employee is added), a webhook notification is sent
2. Workato picks up the notification and processes the change
3. The data is mapped from HiBob's format to your payroll system's format
4. The payroll system is updated automatically

**Sync frequency:**
- Employee changes sync in near real-time during business hours
- Bulk operations (like initial employee loads) are processed in scheduled batches
- Leave requests sync as they're approved in HiBob

**Important notes:**
- The integration is one-directional: HiBob → Payroll (not the other way around)
- HiBob remains your source of truth for employee data
- Changes made directly in the payroll system may be overwritten on the next sync`,
        category: "integrations",
        publishedAt: new Date(),
      },
      {
        title: "Common Integration Questions",
        slug: "integration-faq",
        content: `Here are answers to frequently asked questions about your HiBob integration:

**How long does the project take?**
A typical integration takes 4-8 weeks from Discovery to Go-Live, depending on complexity. Multi-country or multi-payroll setups may take longer.

**What if my data changes during the build?**
That's completely normal. Changes in HiBob during the build phase won't affect the integration — we'll do a full data sync before Go-Live.

**Can I add more fields later?**
Yes. After Go-Live, additional fields or features can be added as part of your support package or as a separate project.

**What happens if the sync fails?**
Workato includes error handling and retry logic. If a sync fails, our team is notified and will investigate. The portal's integration health dashboard shows you the current status at all times.

**Do I need to do anything after Go-Live?**
Day-to-day, the integration runs automatically. You should continue managing employees in HiBob as normal. If you notice any sync issues, email our support team at support@digitaldirections-help.freshdesk.com.

**Is my data secure?**
Yes. All data is encrypted in transit and at rest. Workato is SOC 2 Type II certified, and we follow strict data handling practices.`,
        category: "integrations",
        publishedAt: new Date(),
      },
      {
        title: "Understanding Integration Health Monitoring",
        slug: "integration-health",
        content: `The Integration Health section on your project page shows the real-time status of all services connected to your integration.

**Status indicators:**
- **Healthy** (green) — All services are operating normally
- **Degraded** (amber) — A service is experiencing minor issues but is still functional
- **Down** (red) — A service is experiencing a significant outage
- **Unknown** (grey) — Unable to determine the status

**What's monitored:**
- **HiBob** — The HR platform where your employee data lives
- **Payroll system** — Your payroll provider (KeyPay, MYOB, etc.)
- **Workato** — The integration platform that connects the two

**What to do if you see an issue:**
- **Degraded status**: Usually temporary. Monitor for resolution — most degrade issues resolve within an hour.
- **Down status**: Our team is automatically notified. If it affects your payroll processing, email support@digitaldirections-help.freshdesk.com immediately.
- **Unknown status**: This usually means a health check couldn't complete. It doesn't necessarily mean there's a problem.

Health checks run every 5 minutes, so the dashboard always shows current information.`,
        category: "integrations",
        publishedAt: new Date(),
      },
      {
        title: "When to Contact Digital Directions",
        slug: "when-to-contact",
        content: `Digital Directions is here to help throughout your integration journey. Here's a guide on the best way to get support:

**Use Digi (this chat) for:**
- Quick questions about the portal or your project
- Understanding what stage your project is in
- General information about how HiBob integrations work
- Finding the right knowledge base article

**Email support@digitaldirections-help.freshdesk.com for:**
- Technical issues with your integration (sync failures, data mismatches)
- Requesting changes to your integration configuration
- Reporting bugs or unexpected behaviour
- Feature requests or enhancement ideas
- Urgent production issues affecting payroll processing
- Questions about your contract or support package

We respond within 4 business hours. For urgent payroll-critical issues, say so clearly in your email subject line.

**Tips for faster resolution:**
- Include specific details (employee IDs, dates, error messages)
- Attach screenshots if relevant
- Describe the business impact so we can prioritise appropriately`,
        category: "support",
        publishedAt: new Date(),
      },
      {
        title: "What Is Data Mapping and Why Does It Matter?",
        slug: "data-mapping-explained",
        content: `Data mapping is the process of telling the integration how values in HiBob correspond to values in your payroll system. It's one of the most important steps in the project — getting it right means your payroll runs cleanly from day one.

## What gets mapped?

The most common mapping tables are:

- **Leave types** — e.g. HiBob's "Annual Leave" maps to KeyPay's "Annual Leave (Full Time)"
- **Locations** — e.g. HiBob's "Sydney Office" maps to a payroll work location or branch
- **Pay categories** — how different types of pay are classified in your payroll system
- **Employee records** — linking each HiBob employee to their corresponding payroll employee ID

> note: The mapping step happens in the portal. You'll be invited to review and confirm the mappings before they go live.

## Why does it matter?

If a value in HiBob doesn't have a matching entry in the mapping table, the sync will either fail or skip that record. This is the most common reason employees don't sync correctly after go-live.

## Common mistakes to avoid

- **Typos or name mismatches** — "Annual Leave" vs "Annual leave" (capital L) are treated as different values
- **Unmapped new values** — if you later add a new leave type or location in HiBob, it won't sync until it's added to the mapping table
- **Deleted payroll values** — if a pay category is removed from your payroll system but still referenced in HiBob, syncs for that value will fail

> tip: When you complete the mapping stage in the portal, review every row carefully. If you're unsure what a payroll value means, ask the team before submitting.

## After go-live

Mapping tables are maintained as a living document. If your organisation changes — new locations, new leave types, restructured departments — the mapping tables need to be updated too. This is typically handled as part of your ongoing support.`,
        category: "lifecycle",
        publishedAt: new Date(),
      },
      {
        title: "What to Expect on Go-Live Day",
        slug: "go-live-day",
        content: `Go-live is the moment your integration switches from testing mode to production — real employee data starts flowing from HiBob to your payroll system automatically.

## What happens on go-live day

1. **The team activates your Workato recipes** — the integration recipes are switched from stopped to running in production
2. **An initial data load runs** — all active employees are synced across to make sure payroll starts with a clean, up-to-date dataset
3. **Webhooks go live** — from this point, changes in HiBob (new starters, updates, leave requests) will automatically flow through to payroll
4. **You confirm everything looks correct** — we ask you to spot-check a handful of employee records in your payroll system

> note: Go-live is coordinated with your team in advance. We'll confirm the date and time together so it doesn't clash with payroll processing.

## What to check after go-live

- **Employee records** — do headcounts match between HiBob and payroll?
- **Leave balances** — are they showing correctly?
- **Bank account details** — spot-check a few employees
- **Any employees flagged during UAT** — confirm their records look right

> warning: Don't make bulk changes in payroll directly after go-live. Let the integration settle for a day or two, then verify the data is clean before making any manual adjustments.

## Your first payroll run

Your first live payroll run after go-live is important. Run it as normal, but keep an eye out for anything unexpected. If something looks off, email the support team straight away — don't process until you're comfortable.

## What if something goes wrong?

That's what the team is here for. Email support@digitaldirections-help.freshdesk.com immediately. We monitor go-live days closely and can respond quickly.`,
        category: "lifecycle",
        publishedAt: new Date(),
      },
      {
        title: "System Provisioning — Access We Need and Why",
        slug: "system-provisioning",
        content: `System Provisioning is the stage where you grant the Digital Directions team access to the systems needed to build your integration. Nothing gets built until we have the right access in place.

## What access do we need?

### HiBob
We need access to your HiBob instance to understand your data structure, field configurations, and to set up the webhook connection. Specifically:
- An API service user with read access to employee data
- Access to review your leave types, departments, locations, and custom fields

### Your payroll system
We need access to read your payroll configuration and create/update employee records. The exact access level depends on your payroll system, but typically:
- An admin or integration user account
- API credentials (usually an API key or OAuth token)

### Workato
We manage the Workato environment on your behalf. You'll receive a shared connection so you can view recipe status and integration health in the portal.

> note: All credentials are stored securely and encrypted. We only request the minimum access needed to build and maintain your integration.

## Why does this take time?

Provisioning often gets delayed because:
- IT teams need to approve access requests
- API credentials need to be generated by a system admin
- MFA or IP whitelisting needs to be configured

> tip: As soon as you reach this stage, loop in your IT team or system administrator. The faster access is provisioned, the sooner the build can begin.

## What if I'm not sure what access to grant?

The portal's Provisioning stage lists each access requirement with instructions. If you're unsure about anything, email the support team and we'll walk you through it.`,
        category: "lifecycle",
        publishedAt: new Date(),
      },
      {
        title: "Why Didn't My Employee Sync?",
        slug: "employee-not-syncing",
        content: `If an employee isn't appearing in your payroll system after a change in HiBob, there are a few common reasons. Work through these before contacting support.

## 1. Required fields are missing in HiBob

The integration requires certain fields to be populated before an employee can sync. Common required fields include:
- Employment type
- Start date
- Location
- Pay rate or salary
- Tax file number (for new starters)

If any of these are missing or incomplete in HiBob, the sync will be skipped.

> tip: Check the employee's HiBob profile and make sure all fields are filled in completely before expecting a sync.

## 2. The employee's status in HiBob

Only employees in an **active** or **onboarding** status will sync. Employees in draft or inactive status are intentionally excluded.

## 3. The value isn't mapped

If the employee has a leave type, location, or pay category that isn't in your mapping table, the integration won't know how to translate it — and will skip the record or log an error.

Check that all the employee's values exist in the mapping tables. See **What Is Data Mapping and Why Does It Matter?** for more detail.

## 4. The webhook queue hasn't processed yet

Changes don't happen instantly. HiBob sends a notification (webhook) when something changes, and the integration processes these in batches on a regular schedule. Depending on when the change was made, it may take a few minutes to process.

> note: If it's been more than 15 minutes and the employee still hasn't synced, it's likely not a timing issue.

## 5. The employee already exists in payroll with a conflict

If there's already an employee record in payroll with the same details, the integration may be unable to create a duplicate. This sometimes happens during the transition from manual to automated payroll management.

## Still not syncing?

If you've checked all of the above and the employee still isn't syncing, email support@digitaldirections-help.freshdesk.com with:
- The employee's name and HiBob ID
- What change you made and when
- What you expected to happen`,
        category: "integrations",
        publishedAt: new Date(),
      },
      {
        title: "Why HiBob Is the Source of Truth",
        slug: "hibob-source-of-truth",
        content: `One of the most important things to understand about your integration is that it is **one-directional**: data flows from HiBob into your payroll system, not the other way around.

## What this means in practice

HiBob is the authoritative record for your employee data. The payroll system is a downstream consumer of that data. This means:

- **Make changes in HiBob** — not in payroll. Updates made directly in payroll may be overwritten the next time the integration runs
- **New starters go into HiBob first** — the integration will create them in payroll automatically
- **Terminations are managed in HiBob** — if termination sync is configured, offboarding an employee in HiBob will update payroll accordingly
- **Leave is approved in HiBob** — approved leave flows through to payroll automatically

> warning: If you update a field directly in your payroll system (e.g. change an employee's address or bank account in payroll without updating HiBob), the next sync will overwrite it with the HiBob value.

## What data does NOT come from HiBob?

Some payroll data is owned by the payroll system and is not managed through the integration:

- **Year-to-date figures** — payroll history stays in payroll
- **Tax declarations and tax settings** — managed in payroll unless your setup includes tax sync
- **Pay run results and payslips** — generated by payroll and not written back to HiBob
- **Manual adjustments** — one-off payroll corrections stay in payroll

## A useful rule of thumb

> note: If the data describes the employee as a person (name, address, bank account, employment type, leave), manage it in HiBob. If the data describes their pay history or tax position, that lives in payroll.`,
        category: "integrations",
        publishedAt: new Date(),
      },
      {
        title: "Adding a New Starter — What to Expect",
        slug: "adding-new-starter",
        content: `When you add a new employee in HiBob, the integration will automatically create them in your payroll system — you don't need to enter them twice.

## The flow

1. **Create the employee in HiBob** — fill in all required fields (name, start date, employment type, location, pay rate, bank details, super fund)
2. **HiBob sends a notification** — when the employee is saved, HiBob sends a webhook event to the integration
3. **The integration processes the event** — it creates the employee record in your payroll system with the mapped data
4. **The employee appears in payroll** — ready for their first pay run

> tip: Make sure all required fields are complete in HiBob before the employee's start date. Incomplete profiles won't sync.

## How long does it take?

The integration processes changes in batches on a regular schedule. In most cases, a new employee will appear in payroll within a few minutes of being created in HiBob during business hours.

## What if they don't appear?

See **Why Didn't My Employee Sync?** for a checklist of common causes.

## Bank account and superannuation details

These are included in the initial sync if they're entered in HiBob at the time the employee is created. If they're added later, they'll sync on the next update.

> warning: Always verify bank account details in payroll before processing the employee's first pay run. Confirm with the employee directly if you're unsure.

## Onboarding employees

If your HiBob setup includes an onboarding workflow, employees may be in a pending or onboarding status before they become fully active. The integration typically syncs employees once they reach active status — confirm this behaviour with the team if you're unsure.`,
        category: "integrations",
        publishedAt: new Date(),
      },
      {
        title: "How the Sync Works: Webhooks and the Queue",
        slug: "webhooks-and-sync",
        content: `Understanding how data moves from HiBob to your payroll system helps set the right expectations — particularly around timing.

## Webhooks: how changes are detected

When something changes in HiBob (an employee is updated, leave is approved, a new starter is added), HiBob automatically sends a notification to the integration platform. These notifications are called **webhooks**.

A webhook is essentially HiBob saying: "Hey, something just changed — here's what happened."

## The webhook queue

Rather than processing each webhook the instant it arrives, the integration uses a **webhook queue**. Incoming events are held in the queue and processed in batches on a regular schedule throughout the day.

> note: This means changes are not instant. There is typically a short delay between making a change in HiBob and it appearing in your payroll system.

This design is intentional — it makes the integration more reliable and prevents issues if HiBob sends multiple updates for the same employee in quick succession.

## Processing schedule

The queue is processed automatically throughout business hours and at scheduled intervals outside of them. In most cases, you can expect changes to flow through within a few minutes during the business day.

> tip: If you make a change in HiBob and need it in payroll urgently, allow at least 15 minutes before checking. If it hasn't synced after that, it may indicate an issue worth investigating.

## What triggers a sync?

The following events in HiBob will trigger a webhook and queue an update:

- **Employee created** — new starter added
- **Employee updated** — any field change on an active employee
- **Leave request approved** — leave flows to payroll
- **Leave request cancelled** — cancellation is reflected in payroll
- **Employee terminated** — if termination sync is configured

## What does NOT trigger a sync?

- Changes made directly in the payroll system (these don't notify HiBob)
- Draft employees not yet set to active status
- Changes to fields that aren't included in the integration scope`,
        category: "integrations",
        publishedAt: new Date(),
      },
    ];

    await db.insert(helpArticles).values(helpArticlesData);
    console.log(`✓ Created ${helpArticlesData.length} help articles for Digi knowledge base`);

    console.log("");
    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("Database seeded with:");
    console.log(`  - 1 agency (Digital Directions)`);
    console.log(`  - 6 clients`);
    console.log(`  - ${insertedProjects.length} projects across clients`);
    console.log(`  - ${insertedTickets.length} tickets with varied statuses`);
    console.log(`  - ${insertedIntegrations.length} integration monitors`);
    console.log(`  - ${totalPhases} project phases`);
    console.log(`  - ${commentsData.length} ticket comments`);
    console.log(`  - ${messagesData.length} project messages`);
    console.log(`  - ${filesData.length} uploaded files`);
    console.log(`  - 1 KeyPay discovery template (5 sections, 36 questions)`);
    console.log(`  - Provisioning steps (verified for TechCorp, partial for Meridian)`);
    console.log(`  - 1 Bob Config checklist (approved, TechCorp)`);
    console.log(`  - 1 KeyPay UAT template (3 scenarios)`);
    console.log(`  - ${helpArticlesData.length} help articles (Digi knowledge base)`);

    console.log("");
    console.log("🎉 Dashboards are now ready with realistic data!");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Start the dev server: npm run dev");
    console.log("  2. Create your admin account via sign-up");
    console.log("  3. Use 'npm run make-admin <your-email>' to grant admin access");
    console.log("  4. Explore the admin and client dashboards!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
