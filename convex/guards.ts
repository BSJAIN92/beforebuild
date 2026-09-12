import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { requireViewer } from "./access";
import { isBusy, type Idea, type Tier } from "../lib/model";
import { resolveUsageLimit, USAGE_LIMITS, type UsageKind } from "../lib/limits";
export function decode(row: Doc<"ideas">): Idea { return JSON.parse(row.document) as Idea; }
export function encode(idea: Idea): string { const json = JSON.stringify(idea); if (new TextEncoder().encode(json).byteLength > 420000) throw new ConvexError("This idea is too large. Export it and begin a new exploration."); return json; }
export function limit(key: string, fallback: number, ceiling: number): number {
  const value = Number(process.env[key] || fallback); return Number.isSafeInteger(value) && value > 0 ? Math.min(value, ceiling) : fallback;
}
export async function owned(ctx: QueryCtx | MutationCtx, id: Id<"ideas">) {
  const viewer = await requireViewer(ctx); const row = await ctx.db.get(id);
  if (!row || row.owner !== viewer.owner) throw new ConvexError("This idea was not found.");
  return { viewer, row, idea: decode(row) };
}
export function requireIdle(idea: Idea): void { if (isBusy(idea)) throw new ConvexError("A response is already in progress. Finish or cancel it before making changes."); }
export function requireFreeBeta(tier: Tier): void {
  if (tier !== "basic" && process.env.BILLING_ENABLED === "true") throw new ConvexError("Paid access has not been integrated. Keep BILLING_ENABLED=false for this beta.");
}
export function requireAIEnabled(): void {
  if (process.env.AI_ENABLED !== "true") throw new ConvexError("AI conversations are temporarily paused. Your work is saved. Please try again later.");
}
export async function throttle(ctx: MutationCtx, owner: string): Promise<void> {
  const minute = Math.floor(Date.now() / 60000); const max = limit("AI_MAX_MESSAGES_PER_MINUTE", 5, 30);
  const row = await ctx.db.query("bursts").withIndex("by_owner_minute", q => q.eq("owner", owner).eq("minute", minute)).unique();
  if ((row?.messages || 0) >= max) throw new ConvexError("Too many messages were sent at once. Your work is saved; wait a minute and try again.");
  if (row) await ctx.db.patch(row._id, { messages: row.messages + 1 }); else await ctx.db.insert("bursts", { owner, minute, messages: 1 });
  for (const stale of await ctx.db.query("bursts").withIndex("by_minute", q => q.lt("minute", minute - 1)).take(50)) await ctx.db.delete(stale._id);
}
export async function refundTurn(ctx: MutationCtx, owner: string, tier: Tier): Promise<void> {
  const day = new Date().toISOString().slice(0, 10); const config = USAGE_LIMITS[tier].turns;
  const row = await ctx.db.query("usage").withIndex("by_owner_day", q => q.eq("owner", owner).eq("day", day)).unique();
  if (row && config && (row[config.field] || 0) > 0) await ctx.db.patch(row._id, { [config.field]: (row[config.field] || 0) - 1 });
}
export function usageLimit(tier: Tier, kind: UsageKind): number {
  return resolveUsageLimit(tier, kind, process.env);
}
export async function charge(ctx: MutationCtx, owner: string, tier: Tier, kind: UsageKind) {
  const config = USAGE_LIMITS[tier][kind];
  if (!config) throw new ConvexError("Research is not available on the Basic level.");
  const day = new Date(Date.now()).toISOString().slice(0, 10);
  const usage = await ctx.db.query("usage").withIndex("by_owner_day", q => q.eq("owner", owner).eq("day", day)).unique();
  const max = usageLimit(tier, kind); const used = usage?.[config.field] || 0;
  if (used >= max) throw new ConvexError(`You have reached the ${tier === "basic" ? "Basic" : tier === "intermediate" ? "Intermediate" : "Advanced"} daily ${kind === "turns" ? "AI message" : tier === "advanced" ? "deep-research" : "web-research"} limit. Your work is saved; the limit resets at 00:00 UTC.`);
  if (usage) await ctx.db.patch(usage._id, { [config.field]: used + 1 });
  else await ctx.db.insert("usage", { owner, day, [config.field]: 1 });
}
