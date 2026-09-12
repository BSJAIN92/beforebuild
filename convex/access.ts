import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { normalizeEmail } from "../lib/model";
export function envEmails(key: string): Set<string> { return new Set((process.env[key] || "").split(",").map(normalizeEmail).filter(Boolean)); }
export async function emailAllowed(ctx: QueryCtx | MutationCtx, email: string): Promise<boolean> {
  if (envEmails("ADMIN_EMAILS").has(email)) return true;
  const entry = await ctx.db.query("invites").withIndex("by_email", q => q.eq("email", email)).unique();
  if (entry) return entry.active; // An explicit revocation overrides the environment allowlist.
  return envEmails("BETA_ALLOWLIST").has(email);
}
export async function requireViewer(ctx: QueryCtx | MutationCtx, admin = false) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in to continue.");
  const email = normalizeEmail(identity.email || "");
  if (!email || identity.emailVerified !== true) throw new ConvexError("Sign in with a verified email address. Check the Clerk JWT email_verified claim.");
  const isAdmin = envEmails("ADMIN_EMAILS").has(email);
  if (!(await emailAllowed(ctx, email))) throw new ConvexError("This email is not on the private beta allowlist.");
  if (admin && !isAdmin) throw new ConvexError("Administrator access is required.");
  return { owner: identity.tokenIdentifier, email, name: identity.givenName || identity.name || "Founder", admin: isAdmin, demo: false };
}
export const me = query({ args: {}, handler: async ctx => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { allowed: false, reason: "Sign in to access the private beta.", viewer: null };
  const email = normalizeEmail(identity.email || "");
  const verified = identity.emailVerified === true;
  const allowed = verified && await emailAllowed(ctx, email);
  return { allowed, reason: !verified ? "Please verify your email. The authentication token must include email_verified=true." : allowed ? "" : "This email is not on the beta allowlist. Ask the beta owner to add it.", viewer: { email, name: identity.givenName || identity.name || "Founder", admin: envEmails("ADMIN_EMAILS").has(email), demo: false } };
} });
export const joinWaitlist = mutation({ args: {}, handler: async ctx => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in to join the waitlist.");
  const email = normalizeEmail(identity.email || "");
  if (!email || identity.emailVerified !== true) throw new ConvexError("Verify your email before joining the waitlist.");
  if (await emailAllowed(ctx, email)) return { waiting: false };
  const now = Date.now();
  const existing = await ctx.db.query("waitlist").withIndex("by_email", q => q.eq("email", email)).unique();
  if (existing) await ctx.db.patch(existing._id, { owner: identity.tokenIdentifier, name: identity.givenName || identity.name || "Founder", lastAttemptAt: now, attempts: existing.attempts + 1 });
  else {
    if ((await ctx.db.query("waitlist").take(1000)).length >= 1000) throw new ConvexError("The beta waitlist is currently full.");
    await ctx.db.insert("waitlist", { owner: identity.tokenIdentifier, email, name: identity.givenName || identity.name || "Founder", requestedAt: now, lastAttemptAt: now, attempts: 1 });
  }
  return { waiting: true };
} });
export const listWaitlist = query({ args: {}, handler: async ctx => {
  await requireViewer(ctx, true);
  const entries = await ctx.db.query("waitlist").withIndex("by_requested").order("desc").take(500);
  return entries.map(({ email, name, requestedAt, lastAttemptAt, attempts }) => ({ email, name, requestedAt, lastAttemptAt, attempts }));
} });
export const listInvites = query({ args: {}, handler: async ctx => {
  await requireViewer(ctx, true);
  const stored = await ctx.db.query("invites").take(500);
  const result = new Map([...envEmails("BETA_ALLOWLIST")].map(email => [email, { email, active: true }]));
  stored.forEach(i => result.set(i.email, { email: i.email, active: i.active }));
  return [...result.values()].sort((a, b) => a.email.localeCompare(b.email));
} });
export const setInvite = mutation({ args: { email: v.string(), active: v.boolean() }, handler: async (ctx, args) => {
  const viewer = await requireViewer(ctx, true); const email = normalizeEmail(args.email);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address.");
  if (envEmails("ADMIN_EMAILS").has(email)) throw new ConvexError("Admin access is managed through ADMIN_EMAILS on the server.");
  const existing = await ctx.db.query("invites").withIndex("by_email", q => q.eq("email", email)).unique();
  const changes = { email, active: args.active, updatedAt: Date.now(), updatedBy: viewer.owner };
  if (existing) await ctx.db.patch(existing._id, changes);
  else { if ((await ctx.db.query("invites").take(500)).length >= 500) throw new ConvexError("This beta supports up to 500 allowlist records."); await ctx.db.insert("invites", changes); }
  if (args.active) {
    const waiting = await ctx.db.query("waitlist").withIndex("by_email", q => q.eq("email", email)).unique();
    if (waiting) await ctx.db.delete(waiting._id);
  }
} });
