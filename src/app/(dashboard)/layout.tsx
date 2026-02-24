import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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

  // Get user role and clientId
  const user = await db
    .select({ role: users.role, clientId: users.clientId })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  const isAdmin = user?.role === "admin";

  if (isAdmin) {
    return <AdminShell>{children}</AdminShell>;
  }

  // Fetch client projects for Digi chat context
  let chatProps: { clientId: string; projects: { id: string; name: string }[] } | undefined;
  if (user?.clientId) {
    const clientProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.clientId, user.clientId), isNull(projects.deletedAt)));
    chatProps = { clientId: user.clientId, projects: clientProjects };
  }

  return <ClientShell chatProps={chatProps}>{children}</ClientShell>;
}
