import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireViewer } from "./access";
export const getPricing = query({ args: {}, handler: async ctx => {
  await requireViewer(ctx);
  const record = await ctx.db.query("settings").withIndex("by_key", q => q.eq("key", "pricing")).unique();
  return { enabled: false, currency: record?.currency || process.env.PRICE_CURRENCY || "USD", intermediate: record?.intermediate ?? Number(process.env.INTERMEDIATE_PRICE_CENTS || 0), advanced: record?.advanced ?? Number(process.env.ADVANCED_PRICE_CENTS || 0) };
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
