"use client";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;
export function Providers({ children }: { children: ReactNode }) {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (demo || !client || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return children;
  return <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/sign-in"><ConvexProviderWithClerk client={client} useAuth={useAuth}>{children}</ConvexProviderWithClerk></ClerkProvider>;
}
