import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireViewer } from "./access";
import { suggestedDisplayName, validateDisplayName } from "../lib/profile";

export const initialize = mutation({ args: {}, handler: async ctx => {
  const viewer = await requireViewer(ctx);
  const existing = await ctx.db.query("profiles").withIndex("by_owner", q => q.eq("owner", viewer.owner)).unique();
  if (existing) return { saved: true };
  const identity = await ctx.auth.getUserIdentity();
  const displayName = suggestedDisplayName(identity?.givenName, identity?.name);
  if (!displayName) return { saved: false };
  await ctx.db.insert("profiles", { owner: viewer.owner, displayName, updatedAt: Date.now() });
  return { saved: true };
} });

export const save = mutation({ args: { displayName: v.string() }, handler: async (ctx, args) => {
  const viewer = await requireViewer(ctx);
  let displayName: string;
  try { displayName = validateDisplayName(args.displayName); }
  catch (error) { throw new ConvexError(error instanceof Error ? error.message : "Enter a valid name."); }
  const existing = await ctx.db.query("profiles").withIndex("by_owner", q => q.eq("owner", viewer.owner)).unique();
  const changes = { displayName, updatedAt: Date.now() };
  if (existing) await ctx.db.patch(existing._id, changes);
  else await ctx.db.insert("profiles", { owner: viewer.owner, ...changes });
  return { displayName };
} });
