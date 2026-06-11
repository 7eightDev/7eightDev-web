import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

/**
 * Next.js 16 proxy (formerly middleware): protects the private area.
 * Uses redirectToSignIn explicitly instead of auth.protect() to work
 * around clerk/javascript#8302 (protect() redirect loop on Next 16).
 */
export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }
  }
});

export const config = {
  matcher: [
    // Run only where auth matters: admin area + Clerk internals.
    "/admin(.*)",
    "/(api|trpc)(.*)",
  ],
};
