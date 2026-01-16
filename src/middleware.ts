import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite/(.*)",
  "/api/webhooks(.*)",
  "/api/invites/validate",
  "/api/invites/accept",
  "/api/cron(.*)", // Cron jobs (secured with CRON_SECRET in the route handler)
]);

const isAdminRoute = createRouteMatcher(["/dashboard/admin(.*)"]);
const isClientRoute = createRouteMatcher(["/dashboard/client(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Get role from session claims
  const metadata = (sessionClaims?.metadata as { role?: string }) || {};
  const role = metadata.role;

  // Protect admin routes
  if (isAdminRoute(req)) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard/client", req.url));
    }
  }

  // Protect client routes
  if (isClientRoute(req)) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/dashboard/admin", req.url));
    }
  }

  // Redirect /dashboard to appropriate dashboard based on role
  if (req.nextUrl.pathname === "/dashboard") {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/dashboard/admin", req.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard/client", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
