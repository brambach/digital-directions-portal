import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import {
  users,
  agencies,
  clients,
  projects,
  files,
  messages,
  clientActivity,
} from "./schema";

const db = drizzle(sql);

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log("Clearing existing data...");
    await db.delete(messages);
    await db.delete(files);
    await db.delete(clientActivity);
    await db.delete(projects);
    await db.delete(users);
    await db.delete(clients);
    await db.delete(agencies);

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

    console.log("");
    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("Database initialized:");
    console.log("  - Digital Directions agency record created");
    console.log("  - Ready for real clients and projects");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Create your admin account via sign-up");
    console.log("  2. Use 'npm run make-admin <your-email>' to grant admin access");
    console.log("  3. Invite team members and clients through the portal");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
