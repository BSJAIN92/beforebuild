"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Viewer } from "../lib/backend";
import { DemoWorkspace, LiveWorkspace } from "./Workspace";
function Brand() { return <div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div>; }
function CleanSignInRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/sign-in"); }, [router]);
  return <div className="auth-loading">Opening sign in…</div>;
}
function WaitlistDenied({ reason, email, signOut }: { reason: string; email: string; signOut: () => void }) {
  const joinWaitlist = useMutation(api.access.joinWaitlist);
  const [status, setStatus] = useState<"adding" | "added" | "failed">("adding");
  useEffect(() => { let active = true; joinWaitlist({}).then(result => { if (active) setStatus(result.waiting ? "added" : "failed"); }).catch(() => { if (active) setStatus("failed"); }); return () => { active = false; }; }, [joinWaitlist]);
  return <main className="auth-shell"><div className="auth-card"><Brand /><h1>A small, intentional beta.</h1><p>{reason}</p><p>{email}</p><div className={`notice ${status === "failed" ? "error" : ""}`}>{status === "adding" ? "Adding you to the waitlist…" : status === "added" ? "You’ve been added to the waitlist. The beta owner can now review your request." : "Access is still restricted, and we couldn’t add you to the waitlist. Please try signing in again."}</div><Link className="button primary" href="/support">Contact Support</Link><button className="button secondary" onClick={signOut}>Try another account</button></div></main>;
}
function NameSetup({ save, signOut }: { save: (name: string) => Promise<unknown>; signOut: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = new FormData(event.currentTarget).get("displayName")?.toString() || "";
    setBusy(true); setError("");
    try { await save(name); } catch { setError("Use a name between 1 and 100 characters."); setBusy(false); }
  }
  return <main className="auth-shell"><form className="auth-card name-setup" onSubmit={submit}><Brand /><h1>What should we call you?</h1><p>Your email sign-in did not include a name. Add one for your private BeforeBuild workspace.</p><label className="field-label" htmlFor="profile-name-setup">Your name</label><input id="profile-name-setup" name="displayName" minLength={1} maxLength={100} autoComplete="name" autoFocus required />{error ? <div className="notice error" role="alert">{error}</div> : null}<button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</button><button className="button secondary" type="button" onClick={signOut}>Sign out</button></form></main>;
}
function Connected() {
  const { isLoaded, isSignedIn } = useAuth(); const { signOut } = useClerk();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const access = useQuery(api.access.me, isAuthenticated ? {} : "skip") as { allowed: boolean; reason: string; viewer: Viewer | null } | undefined;
  const initializeProfile = useMutation(api.profiles.initialize); const saveProfile = useMutation(api.profiles.save);
  const [initializingProfile, setInitializingProfile] = useState(false);
  useEffect(() => {
    if (!access?.allowed || !access.viewer || access.viewer.profileStored || access.viewer.needsName || initializingProfile) return;
    setInitializingProfile(true); void initializeProfile({}).finally(() => setInitializingProfile(false));
  }, [access, initializeProfile, initializingProfile]);
  if (!isLoaded) return <div className="auth-loading">Checking your session…</div>;
  if (!isSignedIn) return <CleanSignInRedirect />;
  if (isLoading) return <div className="auth-loading">Connecting to your private workspace…</div>;
  if (!isAuthenticated) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>The workspace couldn’t verify your session.</h1><p>Ask the beta owner to check the Clerk–Convex integration, including the issuer domain and token audience.</p><button className="button secondary" onClick={() => signOut({ redirectUrl: "/sign-in" })}>Sign out</button></div></main>;
  if (!access) return <div className="auth-loading">Checking beta access…</div>;
  if (!access.allowed || !access.viewer) return <WaitlistDenied reason={access.reason} email={access.viewer?.email || ""} signOut={() => { void signOut({ redirectUrl: "/sign-in" }); }} />;
  if (access.viewer.needsName) return <NameSetup save={displayName => saveProfile({ displayName })} signOut={() => { void signOut({ redirectUrl: "/sign-in" }); }} />;
  return <LiveWorkspace viewer={access.viewer} />;
}
export default function ClientRoot() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return <DemoWorkspace />;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>Your workspace is almost ready.</h1><p>Configure the Convex URL and Clerk publishable key to open the private beta. Access is closed until the backend is configured.</p><p>For a local preview only, explicitly set <code>NEXT_PUBLIC_DEMO_MODE=true</code> and restart the development server.</p></div></main>;
  return <Connected />;
}
