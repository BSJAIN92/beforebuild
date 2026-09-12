import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireViewer } from "./access";
import { resolveUsageLimit } from "../lib/limits";
export const getPricing = query({ args: {}, handler: async ctx => {
  await requireViewer(ctx);
  const record = await ctx.db.query("settings").withIndex("by_key", q => q.eq("key", "pricing")).unique();
  return { enabled: false, currency: record?.currency || process.env.PRICE_CURRENCY || "USD", intermediate: record?.intermediate ?? Number(process.env.INTERMEDIATE_PRICE_CENTS || 0), advanced: record?.advanced ?? Number(process.env.ADVANCED_PRICE_CENTS || 0) };
} });
const usageArgs = { basicTurns: v.number(), intermediateTurns: v.number(), intermediateResearch: v.number(), advancedTurns: v.number(), advancedResearch: v.number() };
export const getUsageLimits = query({ args: {}, handler: async ctx => {
  await requireViewer(ctx);
  const record = await ctx.db.query("settings").withIndex("by_key", q => q.eq("key", "usageLimits")).unique();
  return {
    basicTurns: resolveUsageLimit("basic", "turns", process.env, record || {}),
    intermediateTurns: resolveUsageLimit("intermediate", "turns", process.env, record || {}),
    intermediateResearch: resolveUsageLimit("intermediate", "research", process.env, record || {}),
    advancedTurns: resolveUsageLimit("advanced", "turns", process.env, record || {}),
    advancedResearch: resolveUsageLimit("advanced", "research", process.env, record || {})
  };
} });
export const saveUsageLimits = mutation({ args: usageArgs, handler: async (ctx, args) => {
  await requireViewer(ctx, true);
  const turnValues = [args.basicTurns, args.intermediateTurns, args.advancedTurns];
  const researchValues = [args.intermediateResearch, args.advancedResearch];
  if (!turnValues.every(n => Number.isSafeInteger(n) && n >= 1 && n <= 500)) throw new ConvexError("Daily message limits must be whole numbers from 1 to 500.");
  if (!researchValues.every(n => Number.isSafeInteger(n) && n >= 1 && n <= 20)) throw new ConvexError("Daily research limits must be whole numbers from 1 to 20.");
  const existing = await ctx.db.query("settings").withIndex("by_key", q => q.eq("key", "usageLimits")).unique();
  if (existing) await ctx.db.patch(existing._id, args); else await ctx.db.insert("settings", { key: "usageLimits", ...args });
} });
export const savePricing = mutation({ args: { enabled: v.boolean(), currency: v.string(), intermediate: v.number(), advanced: v.number() }, handler: async (ctx, args) => {
  await requireViewer(ctx, true);
  if (args.enabled) throw new ConvexError("Checkout is not implemented. Billing must remain disabled.");
  if (!["USD", "INR", "EUR", "GBP"].includes(args.currency)) throw new ConvexError("Choose a supported currency.");
  if (![args.intermediate, args.advanced].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000)) throw new ConvexError("Prices must be non-negative minor-unit amounts, up to 1,000,000.");
  const existing = await ctx.db.query("settings").withIndex("by_key", q => q.eq("key", "pricing")).unique();
  if (existing) await ctx.db.patch(existing._id, { ...args, enabled: false });
  else await ctx.db.insert("settings", { key: "pricing", ...args, enabled: false });
} });
