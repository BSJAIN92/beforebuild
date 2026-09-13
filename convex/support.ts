import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { normalizeEmail } from "../lib/model";
import { requireViewer } from "./access";

const queryType = v.union(v.literal("Support"), v.literal("Feature request"), v.literal("Other"));
const status = v.union(v.literal("Not started"), v.literal("In progress"), v.literal("Completed"));

async function verifiedIdentity(ctx: Parameters<typeof requireViewer>[0]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Verify your email before contacting support.");
  const email = normalizeEmail(identity.email || "");
  if (!email || identity.emailVerified !== true) throw new ConvexError("Verify your email before contacting support.");
  return { owner: identity.tokenIdentifier, email };
}

export const submit = mutation({ args: { name: v.string(), queryType, message: v.string() }, handler: async (ctx, args) => {
  const identity = await verifiedIdentity(ctx);
  const name = args.name.trim(); const message = args.message.trim();
  if (name.length < 1 || name.length > 100) throw new ConvexError("Enter your name using 1 to 100 characters.");
  if (message.length < 1 || message.length > 500) throw new ConvexError("Keep your message between 1 and 500 characters.");
  const now = Date.now();
  const recent = await ctx.db.query("supportSubmissions").withIndex("by_owner_created", q => q.eq("owner", identity.owner).gt("createdAt", now - 3_600_000)).take(3);
  if (recent.length >= 3) throw new ConvexError("You’ve reached the support limit for this hour. Please try again later.");
  return await ctx.db.insert("supportSubmissions", { ...identity, name, queryType: args.queryType, message, status: "Not started", createdAt: now, updatedAt: now });
} });

export const list = query({ args: {}, handler: async ctx => {
  await requireViewer(ctx, true);
  return await ctx.db.query("supportSubmissions").withIndex("by_created").order("desc").take(500);
} });

export const setStatus = mutation({ args: { id: v.id("supportSubmissions"), status }, handler: async (ctx, args) => {
  await requireViewer(ctx, true);
  const item = await ctx.db.get(args.id); if (!item) throw new ConvexError("This support request was not found.");
  await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
} });
