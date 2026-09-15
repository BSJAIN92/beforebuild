import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { emailAllowed } from "./access";
import { charge, decode, encode, refundTurn } from "./guards";
import { applyTurn, type Turn } from "../lib/ai-contract";
import { makeMessage, type ResearchReport } from "../lib/model";
import { geminiQuotaDay, resolveGeminiDailyLimit } from "../lib/limits";
const args = { id: v.id("ideas"), token: v.string() };
export const reserveGeminiRequest = internalMutation({ args, handler: async (ctx, { id, token }) => {
  const idea = await ctx.db.get(id); if (!idea || idea.runToken !== token) return false;
  if (process.env.AI_PROVIDER !== "gemini") return true;
  const day = geminiQuotaDay(); const max = resolveGeminiDailyLimit(process.env);
  const usage = await ctx.db.query("providerUsage").withIndex("by_provider_day", q => q.eq("provider", "gemini").eq("day", day)).unique();
  if ((usage?.requests || 0) >= max) throw new Error("Gemini's daily beta capacity for this environment is used up. Your work is saved; try again after the daily reset.");
  if (usage) await ctx.db.patch(usage._id, { requests: usage.requests + 1 });
  else await ctx.db.insert("providerUsage", { provider: "gemini", day, requests: 1 });
  return true;
} });
export const claim = internalMutation({ args, handler: async (ctx, { id, token }) => {
  const row = await ctx.db.get(id);
  if (!row || row.runToken !== token || (row.leaseUntil || 0) > Date.now()) return null;
  if (!await emailAllowed(ctx, row.email)) {
    const idea = decode(row); idea.status = "error"; idea.error = "Beta access was revoked. This research job has been stopped.";
    if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
    await ctx.db.patch(id, { document: encode(idea), runToken: undefined, responseId: undefined }); return null;
  }
  await ctx.db.patch(id, { leaseUntil: Date.now() + 125000 });
  return { idea: decode(row), stage: row.runStage || "start", responseId: row.responseId, finish: row.runFinish || false, polls: row.polls || 0, researchKind: row.researchKind, inputMessageId: row.runMessageId };
} });
export const rejectModerated = internalMutation({ args: { ...args, messageId: v.string() }, handler: async (ctx, { id, token, messageId }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token || row.runMessageId !== messageId) return;
  const idea = decode(row); const message = idea.messages.find(item => item.id === messageId && item.role === "user"); if (!message) return;
  const reason = "That message cannot be processed safely. Please answer the current business question without harmful or sensitive content.";
  await ctx.db.insert("rejectedInputs", { owner: row.owner, email: row.email, ideaId: row._id, tier: idea.tier, text: message.text, reason, source: "moderation", createdAt: Date.now() });
  idea.messages = idea.messages.filter(item => item.id !== messageId); idea.answerCount = Math.max(0, idea.answerCount - 1); idea.messages.push(makeMessage("assistant", reason)); idea.status = "draft"; idea.statusLabel = "Ready for a relevant answer";
  await refundTurn(ctx, row.owner, row._id, idea.tier);
  await ctx.db.patch(id, { document: encode(idea), runToken: undefined, runStage: undefined, runMessageId: undefined, leaseUntil: 0, responseId: undefined });
} });
export const markModerated = internalMutation({ args: { ...args, messageId: v.string() }, handler: async (ctx, { id, token, messageId }) => {
  const row = await ctx.db.get(id); if (row?.runToken === token && row.runMessageId === messageId) await ctx.db.patch(id, { runMessageId: undefined });
} });
export const reserveResearch = internalMutation({ args, handler: async (ctx, { id, token }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return false;
  const idea = decode(row); await charge(ctx, row.owner, idea.tier, "research");
  idea.status = "researching"; idea.statusLabel = idea.tier === "advanced" ? "Investigating the opportunity in depth" : "Researching the market and alternatives";
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
  await ctx.db.patch(id, { document: encode(idea), title: idea.title, updatedAt: idea.updatedAt, runToken: undefined, runStage: undefined, runMessageId: undefined, leaseUntil: 0, responseId: undefined });
} });
export const fail = internalMutation({ args: { ...args, error: v.string() }, handler: async (ctx, { id, token, error }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return;
  const idea = decode(row); idea.status = "error"; idea.statusLabel = "Your answer is saved"; idea.error = error.slice(0, 350);
  if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
  await ctx.db.patch(id, { document: encode(idea), runToken: undefined, runStage: undefined, runMessageId: undefined, leaseUntil: 0, responseId: undefined });
} });
export const recordProviderError = internalMutation({ args: {
  ...args, provider: v.string(), operation: v.string(), httpStatus: v.number(), providerStatus: v.string(), category: v.string(), message: v.string()
}, handler: async (ctx, { id, token, provider, operation, httpStatus, providerStatus, category, message }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return;
  const idea = decode(row);
  await ctx.db.insert("providerErrors", {
    owner: row.owner, email: row.email, ideaId: row._id, tier: idea.tier, provider: provider.slice(0, 40), operation: operation.slice(0, 40),
    httpStatus, providerStatus: providerStatus.slice(0, 80), category: category.slice(0, 80), message: message.slice(0, 2000), createdAt: Date.now()
  });
} });
export const watchdog = internalMutation({ args, handler: async (ctx, { id, token }) => {
  const row = await ctx.db.get(id); if (!row || row.runToken !== token) return;
  const idea = decode(row); idea.status = "error"; idea.statusLabel = "The research paused"; idea.error = "This job exceeded the beta time limit. Your work is saved. Retry to continue.";
  if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
  await ctx.db.patch(id, { document: encode(idea), runToken: undefined, runMessageId: undefined, leaseUntil: 0, responseId: undefined });
} });

export const cleanupOrphanIdeaUsage = internalMutation({ args: {}, handler: async ctx => {
  let removed = 0;
  for (const usage of await ctx.db.query("ideaUsage").take(200)) {
    if (!await ctx.db.get(usage.ideaId)) { await ctx.db.delete(usage._id); removed += 1; }
  }
  return { removed };
} });
