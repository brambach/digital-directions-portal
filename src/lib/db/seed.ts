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
  ticketTimeEntries,
  integrationMonitors,
  projectPhases,
  supportHourLogs,
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

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log("Clearing existing data...");
    await db.delete(ticketTimeEntries);
    await db.delete(ticketComments);
    await db.delete(tickets);
    await db.delete(invites);
    await db.delete(integrationMonitors);
    await db.delete(projectPhases);
    await db.delete(messages);
    await db.delete(files);
    await db.delete(clientActivity);
    await db.delete(supportHourLogs);
    await db.delete(projects);
    await db.delete(users);
    await db.delete(clients);
    await db.delete(agencies);
    await db.delete(templatePhases);
    await db.delete(phaseTemplates);

    console.log("✓ Cleared existing data");

    // Create agency
    const [agency] = await db
      .insert(agencies)
      .values({
        name: "Digital Directions",
        logoUrl: "https://picsum.photos/seed/digitaldirections/200/200",
        primaryColor: "#8B5CF6",
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
      { name: "Project Discovery & Provisioning", description: "Initial project setup and requirements gathering", orderIndex: 0, estimatedDays: 5, color: "#8B5CF6" },
      { name: "Integration Build", description: "Build and configure HiBob integrations", orderIndex: 1, estimatedDays: 10, color: "#8B5CF6" },
      { name: "Internal Testing", description: "Internal QA and testing of integrations", orderIndex: 2, estimatedDays: 5, color: "#8B5CF6" },
      { name: "UAT", description: "User Acceptance Testing with client", orderIndex: 3, estimatedDays: 7, color: "#8B5CF6" },
      { name: "Go Live Preparation", description: "Final preparations before production launch", orderIndex: 4, estimatedDays: 3, color: "#8B5CF6" },
      { name: "Go Live", description: "Production launch and monitoring", orderIndex: 5, estimatedDays: 1, color: "#8B5CF6" },
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
        supportHoursPerMonth: 2400, // 40 hours
        hoursUsedThisMonth: 1440, // 24 hours used
        supportBillingCycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
      {
        companyName: "TechCorp Solutions",
        contactName: "Michael Chen",
        contactEmail: "michael.chen@techcorp.io",
        status: "active" as const,
        supportHoursPerMonth: 1800, // 30 hours
        hoursUsedThisMonth: 900, // 15 hours used
        supportBillingCycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
      {
        companyName: "GreenLeaf Retail",
        contactName: "Emily Rodriguez",
        contactEmail: "emily.r@greenleaf.com",
        status: "active" as const,
        supportHoursPerMonth: 1200, // 20 hours
        hoursUsedThisMonth: 600, // 10 hours used
        supportBillingCycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
      {
        companyName: "Summit Financial",
        contactName: "David Park",
        contactEmail: "david.park@summitfin.com",
        status: "active" as const,
        supportHoursPerMonth: 3000, // 50 hours
        hoursUsedThisMonth: 2100, // 35 hours used
        supportBillingCycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
      {
        companyName: "BlueSky Manufacturing",
        contactName: "Jennifer Lee",
        contactEmail: "jen.lee@bluesky.com",
        status: "active" as const,
        supportHoursPerMonth: 1500, // 25 hours
        hoursUsedThisMonth: 450, // 7.5 hours used
        supportBillingCycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
      {
        companyName: "Apex Logistics",
        contactName: "Robert Williams",
        contactEmail: "rob.w@apexlogistics.com",
        status: "inactive" as const,
        supportHoursPerMonth: 0,
        hoursUsedThisMonth: 0,
        supportBillingCycleStart: null,
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
        startDate: daysAgo(45),
        dueDate: daysAgo(-15),
      },
      {
        clientId: insertedClients[0].id,
        name: "Benefits Enrollment Portal",
        description: "Custom employee benefits enrollment through HiBob",
        status: "review",
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
        startDate: daysAgo(60),
        dueDate: daysAgo(-20),
      },
      {
        clientId: insertedClients[1].id,
        name: "Workato Recipe Optimization",
        description: "Optimize existing Workato recipes for performance",
        status: "completed",
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
        startDate: daysAgo(20),
        dueDate: daysAgo(-30),
      },
      {
        clientId: insertedClients[2].id,
        name: "Performance Review System",
        description: "Implement quarterly performance review process",
        status: "planning",
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
        startDate: daysAgo(75),
        dueDate: daysAgo(-10),
      },
      {
        clientId: insertedClients[3].id,
        name: "ADP Integration",
        description: "Connect HiBob with ADP for payroll sync",
        status: "completed",
        startDate: daysAgo(120),
        dueDate: daysAgo(20),
      },
      {
        clientId: insertedClients[3].id,
        name: "Multi-Country Payroll Setup",
        description: "Configure HiBob for operations in 5 countries",
        status: "review",
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
      { projectId: insertedProjects[0].id, clientId: insertedClients[0].id, serviceType: "hibob" as const, serviceName: "HiBob HR Platform" },
      { projectId: insertedProjects[0].id, clientId: insertedClients[0].id, serviceType: "netsuite" as const, serviceName: "NetSuite ERP" },
      { projectId: insertedProjects[1].id, clientId: insertedClients[0].id, serviceType: "workato" as const, serviceName: "Workato Automation" },
      { projectId: insertedProjects[2].id, clientId: insertedClients[1].id, serviceType: "hibob" as const, serviceName: "HiBob Time Tracking" },
      { projectId: insertedProjects[4].id, clientId: insertedClients[2].id, serviceType: "workato" as const, serviceName: "Workato Workflows" },
      { projectId: insertedProjects[6].id, clientId: insertedClients[3].id, serviceType: "adp" as const, serviceName: "ADP Payroll" },
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
    const ticketTypes = ["general_support", "project_issue", "feature_request", "bug_report"] as const;
    const ticketPriorities = ["low", "medium", "high", "urgent"] as const;
    const ticketStatuses = ["open", "in_progress", "waiting_on_client", "resolved", "closed"] as const;

    const ticketsData = [
      { clientId: insertedClients[0].id, projectId: insertedProjects[0].id, title: "API timeout in payroll sync", description: "Intermittent timeouts when syncing payroll data to NetSuite during peak hours", type: "bug_report", priority: "high", status: "in_progress", createdAt: daysAgo(5) },
      { clientId: insertedClients[0].id, projectId: insertedProjects[1].id, title: "Employee import CSV error", description: "Getting validation errors when importing employees via CSV", type: "bug_report", priority: "medium", status: "resolved", createdAt: daysAgo(12) },
      { clientId: insertedClients[0].id, projectId: null, title: "Request for custom reports", description: "Need custom reports for headcount by department", type: "feature_request", priority: "low", status: "open", createdAt: daysAgo(2) },

      { clientId: insertedClients[1].id, projectId: insertedProjects[2].id, title: "Time tracking mobile app issue", description: "Employees can't clock in via mobile app", type: "bug_report", priority: "urgent", status: "in_progress", createdAt: daysAgo(1) },
      { clientId: insertedClients[1].id, projectId: insertedProjects[3].id, title: "Recipe performance degradation", description: "Workato recipes running slower than expected", type: "project_issue", priority: "medium", status: "closed", createdAt: daysAgo(45) },
      { clientId: insertedClients[1].id, projectId: null, title: "Training session request", description: "Need training for new HR staff on HiBob", type: "general_support", priority: "low", status: "waiting_on_client", createdAt: daysAgo(8) },

      { clientId: insertedClients[2].id, projectId: insertedProjects[4].id, title: "Onboarding workflow not triggering", description: "New hire onboarding automation stopped working", type: "bug_report", priority: "high", status: "resolved", createdAt: daysAgo(15) },
      { clientId: insertedClients[2].id, projectId: null, title: "Question about permissions", description: "How to set up department-specific permissions?", type: "general_support", priority: "low", status: "closed", createdAt: daysAgo(20) },

      { clientId: insertedClients[3].id, projectId: insertedProjects[6].id, title: "Compliance report formatting", description: "Need to adjust formatting on quarterly compliance reports", type: "project_issue", priority: "medium", status: "in_progress", createdAt: daysAgo(7) },
      { clientId: insertedClients[3].id, projectId: insertedProjects[7].id, title: "ADP integration complete", description: "Confirming successful completion of ADP integration", type: "general_support", priority: "low", status: "closed", createdAt: daysAgo(30) },
      { clientId: insertedClients[3].id, projectId: null, title: "Add new country payroll", description: "Need to add Germany to multi-country payroll setup", type: "feature_request", priority: "medium", status: "open", createdAt: daysAgo(3) },

      { clientId: insertedClients[4].id, projectId: insertedProjects[9].id, title: "Shift scheduling requirements", description: "Discussion of requirements for shift scheduling", type: "project_issue", priority: "medium", status: "waiting_on_client", createdAt: daysAgo(4) },
    ];

    const insertedTickets = await db.insert(tickets).values(
      ticketsData.map((t) => ({
        ...t,
        createdBy: PLACEHOLDER_USER_ID, // Will update after creating users
        timeSpentMinutes: 0,
      }))
    ).returning();

    console.log(`✓ Created ${insertedTickets.length} tickets`);

    // Create ticket time entries (spread across Oct, Nov, Dec)
    const timeEntriesData = [];

    // October entries
    for (let i = 0; i < 15; i++) {
      const ticket = insertedTickets[Math.floor(Math.random() * insertedTickets.length)];
      timeEntriesData.push({
        ticketId: ticket.id,
        userId: PLACEHOLDER_USER_ID,
        minutes: [30, 45, 60, 90, 120, 180][Math.floor(Math.random() * 6)],
        description: ["Investigated issue", "Implemented fix", "Testing changes", "Code review", "Documentation update"][Math.floor(Math.random() * 5)],
        loggedAt: monthsAgo(2).toISOString().includes("Oct") ? daysAgo(60 + Math.floor(Math.random() * 30)) : daysAgo(60 + Math.floor(Math.random() * 30)),
        countTowardsSupportHours: true,
      });
    }

    // November entries
    for (let i = 0; i < 12; i++) {
      const ticket = insertedTickets[Math.floor(Math.random() * insertedTickets.length)];
      timeEntriesData.push({
        ticketId: ticket.id,
        userId: PLACEHOLDER_USER_ID,
        minutes: [30, 45, 60, 90, 120, 180][Math.floor(Math.random() * 6)],
        description: ["Client meeting", "Bug fixing", "Feature implementation", "System configuration", "Testing"][Math.floor(Math.random() * 5)],
        loggedAt: daysAgo(30 + Math.floor(Math.random() * 30)),
        countTowardsSupportHours: true,
      });
    }

    // December entries (current month)
    for (let i = 0; i < 20; i++) {
      const ticket = insertedTickets[Math.floor(Math.random() * insertedTickets.length)];
      timeEntriesData.push({
        ticketId: ticket.id,
        userId: PLACEHOLDER_USER_ID,
        minutes: [30, 45, 60, 90, 120, 180, 240][Math.floor(Math.random() * 7)],
        description: ["Troubleshooting", "Implementation", "Code review", "Client support", "Documentation", "Testing", "Deployment"][Math.floor(Math.random() * 7)],
        loggedAt: daysAgo(Math.floor(Math.random() * 30)),
        countTowardsSupportHours: true,
      });
    }

    // Insert time entries
    await db.insert(ticketTimeEntries).values(timeEntriesData);

    console.log(`✓ Created ${timeEntriesData.length} ticket time entries`);

    // Create ticket comments
    const commentsData = [
      { ticketId: insertedTickets[0].id, authorId: PLACEHOLDER_USER_ID, content: "I've identified the root cause - it's a connection pool exhaustion issue during peak load.", isInternal: true, createdAt: daysAgo(4) },
      { ticketId: insertedTickets[0].id, authorId: PLACEHOLDER_USER_ID, content: "We've implemented a fix and are testing in staging. Should be ready for production tomorrow.", isInternal: false, createdAt: daysAgo(3) },

      { ticketId: insertedTickets[1].id, authorId: PLACEHOLDER_USER_ID, content: "The issue was incorrect date formatting in the CSV. Updated documentation with correct format.", isInternal: false, createdAt: daysAgo(11) },

      { ticketId: insertedTickets[3].id, authorId: PLACEHOLDER_USER_ID, content: "URGENT: Investigating mobile app clock-in issue. ETA 2 hours.", isInternal: true, createdAt: daysAgo(1) },

      { ticketId: insertedTickets[6].id, authorId: PLACEHOLDER_USER_ID, content: "Fixed the workflow trigger. It was a permissions issue with the service account.", isInternal: false, createdAt: daysAgo(14) },

      { ticketId: insertedTickets[8].id, authorId: PLACEHOLDER_USER_ID, content: "Working on the compliance report formatting. Will send updated template by end of day.", isInternal: false, createdAt: daysAgo(6) },
    ];

    // Insert ticket comments
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

    // Insert messages
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

    // Insert files
    await db.insert(files).values(filesData);

    console.log(`✓ Created ${filesData.length} files`);

    console.log("");
    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("Database seeded with:");
    console.log(`  - 1 agency (Digital Directions)`);
    console.log(`  - 6 clients with support hour allocations`);
    console.log(`  - ${insertedProjects.length} projects across clients`);
    console.log(`  - ${insertedTickets.length} tickets with varied statuses`);
    console.log(`  - ${insertedIntegrations.length} integration monitors`);
    console.log(`  - ${totalPhases} project phases`);
    console.log(`  - ${timeEntriesData.length} time entries (Oct/Nov/Dec)`);
    console.log(`  - ${commentsData.length} ticket comments`);
    console.log(`  - ${messagesData.length} project messages`);
    console.log(`  - ${filesData.length} uploaded files`);
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
