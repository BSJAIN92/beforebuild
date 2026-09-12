"use client";
import { RedirectToSignIn, useAuth, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Viewer } from "../lib/backend";
import { DemoWorkspace, LiveWorkspace } from "./Workspace";
function Brand() { return <div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div>; }
function Connected() {
  const { isLoaded, isSignedIn } = useAuth(); const { signOut } = useClerk();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const access = useQuery(api.access.me, isAuthenticated ? {} : "skip") as { allowed: boolean; reason: string; viewer: Viewer | null } | undefined;
  if (!isLoaded) return <div className="auth-loading">Checking your session…</div>;
  if (!isSignedIn) return <RedirectToSignIn />;
  if (isLoading) return <div className="auth-loading">Connecting to your private workspace…</div>;
  if (!isAuthenticated) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>The workspace couldn’t verify your session.</h1><p>Ask the beta owner to check the Clerk–Convex integration, including the issuer domain and token audience.</p><button className="button secondary" onClick={() => signOut({ redirectUrl: "/sign-in" })}>Sign out</button></div></main>;
  if (!access) return <div className="auth-loading">Checking beta access…</div>;
  if (!access.allowed || !access.viewer) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>A small, intentional beta.</h1><p>{access.reason}</p><p>{access.viewer?.email}</p><button className="button secondary" onClick={() => signOut({ redirectUrl: "/sign-in" })}>Try another account</button></div></main>;
  return <LiveWorkspace viewer={access.viewer} />;
}
export default function ClientRoot() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return <DemoWorkspace />;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>Your workspace is almost ready.</h1><p>Configure the Convex URL and Clerk publishable key to open the private beta. Access is closed until the backend is configured.</p><p>For a local preview only, explicitly set <code>NEXT_PUBLIC_DEMO_MODE=true</code> and restart the development server.</p></div></main>;
  return <Connected />;
}
