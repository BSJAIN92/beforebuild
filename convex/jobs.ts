import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { emailAllowed } from "./access";
import { charge, decode, encode } from "./guards";
import { applyTurn, type Turn } from "../lib/ai-contract";
import { makeMessage, type ResearchReport } from "../lib/model";
const args = { id: v.id("ideas"), token: v.string() };
export const claim = internalMutation({ args, handler: async (ctx, { id, token }) => {
  const row = await ctx.db.get(id);
  if (!row || row.runToken !== token || (row.leaseUntil || 0) > Date.now()) return null;
  if (!await emailAllowed(ctx, row.email)) {
    const idea = decode(row); idea.status = "error"; idea.error = "Beta access was revoked. This research job has been stopped.";
    if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
    await ctx.db.patch(id, { document: encode(idea), runToken: undefined, responseId: undefined }); return null;
  }
  await ctx.db.patch(id, { leaseUntil: Date.now() + 125000 });
  return { idea: decode(row), stage: row.runStage || "start", responseId: row.responseId, finish: row.runFinish || false, polls: row.polls || 0, researchKind: row.researchKind };
} });
export const reserveResearch = internalMutation({ args, handler: async (ctx, { id, token }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return false;
  await charge(ctx, row.owner, "research");
  const idea = decode(row); idea.status = "researching"; idea.statusLabel = idea.tier === "advanced" ? "Investigating the opportunity in depth" : "Researching the market and alternatives";
  await ctx.db.patch(id, { document: encode(idea), runStage: "research-started" }); return true;
} });
export const waitForResearch = internalMutation({ args: { ...args, responseId: v.string(), kind: v.string() }, handler: async (ctx, { id, token, responseId, kind }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return false;
  await ctx.db.patch(id, { responseId, researchKind: kind, runStage: "poll", leaseUntil: 0, polls: (row.polls || 0) + 1 });
  await ctx.scheduler.runAfter(15000, internal.runner.work, { id, token }); return true;
} });
export const storeResearch = internalMutation({ args: { ...args, reportJson: v.string() }, handler: async (ctx, { id, token, reportJson }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return false;
  const report = JSON.parse(reportJson) as ResearchReport; const idea = decode(row);
  if (report.demo || !report.sources?.length || !["intermediate", "advanced"].includes(report.kind)) throw new Error("Invalid research result.");
  if (!idea.reports.some(r => r.id === report.id)) idea.reports.push(report);
  idea.status = "thinking"; idea.statusLabel = "Turning research into better questions";
  idea.messages.push(makeMessage("system", `${report.kind === "advanced" ? "Deep" : "Focused"} AI-led research is ready with ${report.sources.length} cited sources. Review the Research tab. These findings provide context; they do not validate the business.`));
  await ctx.db.patch(id, { document: encode(idea), runStage: "synthesize", leaseUntil: 0, responseId: undefined });
  await ctx.scheduler.runAfter(0, internal.runner.work, { id, token }); return true;
} });
export const complete = internalMutation({ args: { ...args, turnJson: v.string() }, handler: async (ctx, { id, token, turnJson }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return;
  const turn = JSON.parse(turnJson) as Turn;
  const before = decode(row); const idea = applyTurn(before, turn, row.runFinish || false);
  const reply = turn.reply + (!idea.question || turn.reply.includes(idea.question) ? "" : "\n\n" + idea.question);
  idea.messages.push(makeMessage("assistant", reply));
  await ctx.db.patch(id, { document: encode(idea), title: idea.title, updatedAt: idea.updatedAt, runToken: undefined, runStage: undefined, leaseUntil: 0, responseId: undefined });
} });
export const fail = internalMutation({ args: { ...args, error: v.string() }, handler: async (ctx, { id, token, error }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return;
  const idea = decode(row); idea.status = "error"; idea.statusLabel = "Your answer is saved"; idea.error = error.slice(0, 350);
  if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
  await ctx.db.patch(id, { document: encode(idea), runToken: undefined, runStage: undefined, leaseUntil: 0, responseId: undefined });
} });
export const watchdog = internalMutation({ args, handler: async (ctx, { id, token }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return;
  const idea = decode(row); idea.status = "error"; idea.statusLabel = "The research paused"; idea.error = "This job exceeded the beta time limit. Your work is saved. Retry to continue.";
  if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
  await ctx.db.patch(id, { document: encode(idea), runToken: undefined, leaseUntil: 0, responseId: undefined });
} });
