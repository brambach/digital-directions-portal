/**
 * Sprint 2 pre-migration: drops removed tables and columns before db:push
 * so drizzle-kit doesn't prompt about renames.
 * Run once: npx tsx src/lib/db/pre-migrate.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { sql } from "@vercel/postgres";

async function preMigrate() {
  console.log("🔧 Sprint 2 pre-migration: dropping removed schema items...");

  // Drop tables that no longer exist in schema
  await sql`DROP TABLE IF EXISTS ticket_time_entries CASCADE`;
  console.log("✓ Dropped ticket_time_entries");

  await sql`DROP TABLE IF EXISTS support_hour_logs CASCADE`;
  console.log("✓ Dropped support_hour_logs");

  // Drop removed columns from clients
  await sql`ALTER TABLE clients DROP COLUMN IF EXISTS support_hours_per_month`;
  await sql`ALTER TABLE clients DROP COLUMN IF EXISTS hours_used_this_month`;
  await sql`ALTER TABLE clients DROP COLUMN IF EXISTS support_billing_cycle_start`;
  console.log("✓ Dropped support hours columns from clients");

  // Drop removed columns from tickets
  await sql`ALTER TABLE tickets DROP COLUMN IF EXISTS estimated_minutes`;
  await sql`ALTER TABLE tickets DROP COLUMN IF EXISTS time_spent_minutes`;
  console.log("✓ Dropped time tracking columns from tickets");

  console.log("✅ Pre-migration complete. Run db:push now.");
  process.exit(0);
}

preMigrate().catch((err) => {
  console.error("❌ Pre-migration failed:", err);
  process.exit(1);
});
