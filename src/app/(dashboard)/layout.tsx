import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import TopNavWrapper from "@/components/layout/top-nav-wrapper";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  // Define navigation items based on role
  const navItems = isAdmin
    ? [
        { label: "Overview", href: "/dashboard/admin" },
        { label: "Clients", href: "/dashboard/admin/clients" },
        { label: "Projects", href: "/dashboard/admin/projects" },
        { label: "Tickets", href: "/dashboard/admin/tickets" },
        { label: "Settings", href: "/dashboard/admin/settings" },
      ]
    : [
        { label: "Overview", href: "/dashboard/client" },
        { label: "Projects", href: "/dashboard/client/projects" },
        { label: "Tickets", href: "/dashboard/client/tickets" },
      ];

  return (
    <div className="min-h-screen bg-[#F9FAFF] relative">
      {/* Ambient Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-purple-50/10 to-transparent pointer-events-none z-0"></div>

      {/* Top Navigation */}
      <TopNavWrapper navItems={navItems} isAdmin={isAdmin} />

      {/* Main Content */}
      <main className="relative z-10">{children}</main>
    </div>
  );
}
