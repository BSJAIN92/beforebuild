"use client";
import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { SupportQueryType, SupportStatus } from "../lib/backend";
function Brand() { return <div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div>; }
function ConnectedSupport() {
  const { isLoaded, isSignedIn } = useAuth(); const { signOut } = useClerk(); const { isLoading, isAuthenticated } = useConvexAuth();
  const access = useQuery(api.access.me, isAuthenticated ? {} : "skip");
  const submissions = useQuery(api.support.list, access?.viewer?.admin ? {} : "skip");
  const submit = useMutation(api.support.submit); const setStatus = useMutation(api.support.setStatus);
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | SupportStatus>("All");
  const [typeFilter, setTypeFilter] = useState<"All" | SupportQueryType>("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  if (!isLoaded || isLoading || (isSignedIn && isAuthenticated && !access)) return <div className="auth-loading">Opening support…</div>;
  if (!isSignedIn) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>Contact Support</h1><p>Verify your email before sending a message. Contacting Support will not add you to the beta waitlist.</p><div className="auth-actions"><Link className="button primary" href="/support/sign-in">Verify email to continue</Link><Link className="button secondary" href="/sign-in">Return to beta sign in</Link></div></div></main>;
  if (!isAuthenticated || !access?.viewer) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>We couldn’t verify your email.</h1><p>Sign out and try again with an email address you can verify.</p><button className="button secondary" onClick={() => void signOut({ redirectUrl: "/support" })}>Sign out</button></div></main>;
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const element = event.currentTarget; const form = new FormData(element);
    try { await submit({ name: String(form.get("name") || ""), queryType: String(form.get("queryType")) as SupportQueryType, message: String(form.get("message") || "") }); setSent(true); element.reset(); }
    catch (cause) { setError(cause instanceof Error ? cause.message.replace(/^.*ConvexError:\s*/, "") : "Your message could not be sent. Please try again."); }
    finally { setBusy(false); }
  }
  const viewer = access.viewer;
  const visibleSubmissions = submissions?.filter(item => statusFilter === "All" || item.status === statusFilter)
    .filter(item => typeFilter === "All" || item.queryType === typeFilter)
    .slice().sort((a, b) => sortOrder === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
  if (viewer.admin) return <main className="support-shell"><section className="support-card"><Brand /><div className="support-heading"><div><span className="eyebrow">ADMIN SUPPORT</span><h1>Support requests</h1><p>Review messages and keep their progress up to date.</p></div><Link className="text-button" href="/">Back to workspace</Link></div>
    {error ? <div className="notice error" role="alert">{error}</div> : null}
    <section className="support-admin admin-primary"><div className="support-controls"><label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as "All" | SupportStatus)}><option>All</option><option>Not started</option><option>In progress</option><option>Completed</option></select></label><label>Type<select value={typeFilter} onChange={event => setTypeFilter(event.target.value as "All" | SupportQueryType)}><option>All</option><option>Support</option><option>Feature request</option><option>Other</option></select></label><label>Sort<select value={sortOrder} onChange={event => setSortOrder(event.target.value as "newest" | "oldest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><span>{visibleSubmissions?.length ?? 0} shown</span></div><div className="support-list">{visibleSubmissions?.map(item => <article key={item._id}><div><strong>{item.queryType}</strong><span>{item.name} · {item.email}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div><p>{item.message}</p><label>Status<select value={item.status} onChange={async event => { setError(""); try { await setStatus({ id: item._id, status: event.target.value as SupportStatus }); } catch { setError("The status could not be updated. Please try again."); } }}><option>Not started</option><option>In progress</option><option>Completed</option></select></label></article>)}{submissions === undefined ? <p>Loading requests…</p> : submissions.length === 0 ? <p>No support requests yet.</p> : visibleSubmissions?.length === 0 ? <p>No requests match these filters.</p> : null}</div></section>
  </section></main>;
  return <main className="support-shell"><section className="support-card"><Brand /><div className="support-heading"><div><span className="eyebrow">VERIFIED EMAIL SUPPORT</span><h1>How can we help?</h1><p>Your reply will go to <strong>{viewer.email}</strong>. This does not add you to the beta waitlist.</p></div><Link className="text-button" href={access.allowed ? "/" : "/sign-in"}>{access.allowed ? "Back to workspace" : "Back"}</Link></div>
    {sent ? <div className="notice" role="status">Your message was sent. We’ll reply to your verified email.</div> : null}{error ? <div className="notice error" role="alert">{error}</div> : null}
    <form className="support-form" onSubmit={onSubmit}><label>Name<input name="name" defaultValue={viewer.name === "Founder" ? "" : viewer.name} minLength={1} maxLength={100} required /></label><label>Email<input value={viewer.email} readOnly aria-describedby="verified-email-note" /></label><small id="verified-email-note">Verified through your sign-in.</small><label>Query type<select name="queryType" required><option>Support</option><option>Feature request</option><option>Other</option></select></label><label>Message<textarea name="message" minLength={1} maxLength={500} rows={7} required /></label><small>Maximum 500 characters. Up to 3 submissions per hour.</small><button className="button primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Submit"}</button></form>
  </section></main>;
}
export default function SupportPortal() { if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="auth-shell"><div className="auth-card"><Brand /><h1>Support needs connected mode.</h1><p>Configure Clerk and Convex to verify email addresses and store support messages.</p><Link className="text-button" href="/">Back</Link></div></main>; return <ConnectedSupport />; }
