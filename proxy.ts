import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes reachable without authentication:
 * - "/"            landing page
 * - "/p/:uuid"     client-facing public quote (view + accept). The UUID is the
 *                  capability token — knowing the link is the authorization.
 * - "/sign-in/*"   Clerk sign-in screen (must be public to avoid a redirect loop)
 */
const isPublicRoute = createRouteMatcher(["/", "/p/(.*)", "/sign-in(.*)"]);

/**
 * Next.js 16 proxy (formerly middleware): protects the private area.
 * We use auth.protect() to ensure all non-public routes, including 404s,
 * are redirected to sign-in.
 */
const proxyHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const proxy = proxyHandler;
export default proxyHandler;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|.*\\..*).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
