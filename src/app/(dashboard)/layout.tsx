import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AdminShell from "@/components/layout/admin-shell";
import ClientShell from "@/components/layout/client-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user role
  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  const isAdmin = user?.role === "admin";

  if (isAdmin) {
    return <AdminShell>{children}</AdminShell>;
  }

  return <ClientShell>{children}</ClientShell>;
}
