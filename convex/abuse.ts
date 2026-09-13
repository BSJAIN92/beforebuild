import { query } from "./_generated/server";
import { requireViewer } from "./access";
export const dashboard = query({ args: {}, handler: async ctx => {
  await requireViewer(ctx, true); const day = new Date().toISOString().slice(0, 10);
  const usage = await ctx.db.query("usage").filter(q => q.eq(q.field("day"), day)).take(1000);
  const ideaUsage = await ctx.db.query("ideaUsage").withIndex("by_day", q => q.eq("day", day)).take(1000);
  const rejected = await ctx.db.query("rejectedInputs").withIndex("by_created").order("desc").take(200);
  const totals = usage.reduce((sum, row) => ({ basicTurns: sum.basicTurns + (row.basicTurns || 0), intermediateTurns: sum.intermediateTurns + (row.intermediateTurns || 0), advancedTurns: sum.advancedTurns + (row.advancedTurns || 0), intermediateResearch: sum.intermediateResearch + (row.intermediateResearch || 0), advancedResearch: sum.advancedResearch + (row.advancedResearch || 0) }), { basicTurns: 0, intermediateTurns: 0, advancedTurns: 0, intermediateResearch: 0, advancedResearch: 0 });
  for (const row of ideaUsage) { totals.basicTurns += row.basicTurns || 0; totals.intermediateTurns += row.intermediateTurns || 0; totals.advancedTurns += row.advancedTurns || 0; }
  return { day, users: new Set([...usage.map(row => row.owner), ...ideaUsage.map(row => row.owner)]).size, totals, rejected: rejected.map(({ _id, email, ideaId, tier, text, reason, source, createdAt }) => ({ id: _id, email, ideaId, tier, text, reason, source, createdAt })) };
} });
