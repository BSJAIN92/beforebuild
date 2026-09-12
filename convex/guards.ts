import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { requireViewer } from "./access";
import { isBusy, type Idea, type Tier } from "../lib/model";
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
export async function charge(ctx: MutationCtx, owner: string, kind: "turns" | "research") {
  const day = new Date(Date.now()).toISOString().slice(0, 10);
  const usage = await ctx.db.query("usage").withIndex("by_owner_day", q => q.eq("owner", owner).eq("day", day)).unique();
  const max = kind === "turns" ? limit("AI_MAX_DAILY_TURNS", 80, 500) : limit("AI_MAX_DAILY_RESEARCH", 3, 20);
  if ((usage?.[kind] || 0) >= max) throw new ConvexError(kind === "turns" ? "You have reached the daily beta interview limit. Your work is saved; the limit resets at 00:00 UTC." : "You have reached the daily beta research limit. Your work is saved; the limit resets at 00:00 UTC.");
  if (usage) await ctx.db.patch(usage._id, { [kind]: usage[kind] + 1 });
  else await ctx.db.insert("usage", { owner, day, turns: kind === "turns" ? 1 : 0, research: kind === "research" ? 1 : 0 });
}
