"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useConvex, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { AbuseDashboard, Backend, Invite, Pricing, UsageLimits, Viewer } from "../lib/backend";
import type { Idea } from "../lib/model";
import { createDemoBackend } from "../lib/demo";
import { mountWorkspace } from "../lib/ui";
import { createLiveBackend } from "./live-backend";
function Surface({ backend }: { backend: Backend }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => { if (element.current) return mountWorkspace(element.current, backend); }, [backend]);
  return <div ref={element}><div className="auth-loading">Opening your workspace…</div></div>;
}
export function DemoWorkspace() {
  const [backend, setBackend] = useState<Backend | null>(null);
  useEffect(() => { setBackend(createDemoBackend()); }, []);
  return backend ? <Surface backend={backend} /> : <div className="auth-loading">Opening the interactive demo…</div>;
}
export function LiveWorkspace({ viewer }: { viewer: Viewer }) {
  const client = useConvex(); const { signOut } = useClerk();
  const ideas = useQuery(api.ideas.list) as Idea[] | undefined;
  const pricing = useQuery(api.settings.getPricing) as Pricing | undefined;
  const usageLimits = useQuery(api.settings.getUsageLimits) as UsageLimits | undefined;
  const invites = useQuery(api.access.listInvites, viewer.admin ? {} : "skip") as Invite[] | undefined;
  const abuse = useQuery(api.abuse.dashboard, viewer.admin ? {} : "skip") as AbuseDashboard | undefined;
  const backend = useMemo(() => createLiveBackend(client, viewer, () => signOut({ redirectUrl: "/sign-in" })), [client, viewer.email, viewer.name, viewer.admin, signOut]);
  useEffect(() => { if (ideas && pricing && usageLimits) backend.push({ ideas, pricing, usageLimits, invites: invites || [], abuse, viewer }); }, [backend, ideas, pricing, usageLimits, invites, abuse, viewer]);
  if (!ideas || !pricing || !usageLimits) return <div className="auth-loading">Loading your saved ideas…</div>;
  return <Surface backend={backend} />;
}
