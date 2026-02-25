import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage() {
  await requireAdmin();
  redirect("/dashboard/admin/tickets");
}
