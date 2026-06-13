import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/"]);

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
