import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk still requires proxy/middleware for session handling.
 * Auth checks live on each page/API (see Clerk's createRouteMatcher migration).
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};