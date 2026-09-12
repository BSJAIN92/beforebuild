import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
const authenticate = clerkMiddleware({
  frontendApiProxy: {
    // Clerk development instances do not support Frontend API proxying.
    // Production enables it by setting NEXT_PUBLIC_CLERK_PROXY_URL.
    enabled: Boolean(process.env.NEXT_PUBLIC_CLERK_PROXY_URL),
  },
});
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.NEXT_PUBLIC_CONVEX_URL) return NextResponse.next();
  return authenticate(request, event);
}
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/__clerk/(.*)",
  ],
};
