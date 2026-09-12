import { query, mutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { BLOCKS, createIdea, makeMessage, uid, normalizeEmail, tierRank, TIERS, type Idea, type Tier, type CanvasItem } from "../lib/model";
import { requireViewer } from "./access";
import { charge, decode, encode, limit, owned, requireAIEnabled, requireFreeBeta, requireIdle, throttle } from "./guards";
import { founderInputError } from "../lib/input-policy";
const tierValidator = v.union(v.literal("basic"), v.literal("intermediate"), v.literal("advanced"));
const evidenceValidator = v.union(v.literal("founder"), v.literal("research"), v.literal("assumption"));
const idArgs = { id: v.id("ideas") };
async function save(ctx: MutationCtx, row: Doc<"ideas">, idea: Idea) { idea.updatedAt = Date.now(); await ctx.db.patch(row._id, { document: encode(idea), title: idea.title, updatedAt: idea.updatedAt }); }
async function enqueue(ctx: MutationCtx, row: Doc<"ideas">, idea: Idea, finish: boolean, inputMessageId?: string): Promise<void> {
  requireAIEnabled(); await throttle(ctx, row.owner);
  await charge(ctx, row.owner, idea.tier, "turns");
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  idea.status = "thinking"; idea.statusLabel = "Thinking through your answer"; idea.error = ""; idea.updatedAt = Date.now();
  await ctx.db.patch(row._id, { document: encode(idea), title: idea.title, email: normalizeEmail((await ctx.auth.getUserIdentity())?.email || row.email), updatedAt: idea.updatedAt, runToken: token, runStage: "start", runStartedAt: Date.now(), runFinish: finish, runMessageId: inputMessageId, leaseUntil: 0, responseId: undefined, researchKind: undefined, polls: 0 });
  await ctx.scheduler.runAfter(0, internal.runner.work, { id: row._id, token });
  await ctx.scheduler.runAfter(31 * 60 * 1000, internal.jobs.watchdog, { id: row._id, token });
}
export const list = query({ args: {}, handler: async ctx => {
  const viewer = await requireViewer(ctx);
  const rows = await ctx.db.query("ideas").withIndex("by_owner", q => q.eq("owner", viewer.owner)).order("desc").take(limit("AI_MAX_IDEAS", 30, 30));
  return rows.map(decode); // Never return provider response IDs, ownership metadata, or run tokens.
} });
export const create = mutation({ args: { description: v.string(), tier: tierValidator, aiConsent: v.boolean(), researchConsent: v.boolean() }, handler: async (ctx, args) => {
  const viewer = await requireViewer(ctx); const description = args.description.trim();
  if (description.length < 20 || description.length > 5000) throw new ConvexError("Describe your idea in 20–5,000 characters.");
  requireFreeBeta(args.tier);
  if (!args.aiConsent) throw new ConvexError("Please agree to AI processing before starting.");
  if (args.tier !== "basic" && !args.researchConsent) throw new ConvexError("This level needs your consent to AI-led web research.");
  const max = limit("AI_MAX_IDEAS", 30, 30);
  if ((await ctx.db.query("ideas").withIndex("by_owner", q => q.eq("owner", viewer.owner)).take(max)).length >= max) throw new ConvexError(`The beta limit is ${max} saved ideas. Export and remove an old idea to add another.`);
  const idea = createIdea(description, args.tier, args.researchConsent, undefined, args.aiConsent);
  const id = await ctx.db.insert("ideas", { owner: viewer.owner, email: viewer.email, title: idea.title, updatedAt: idea.updatedAt, document: encode(idea) });
  idea.id = id; await ctx.db.patch(id, { document: encode(idea) }); return id;
} });
export const send = mutation({ args: { ...idArgs, text: v.string(), finish: v.optional(v.boolean()) }, handler: async (ctx, args) => {
  const { viewer, row, idea } = await owned(ctx, args.id); requireIdle(idea); requireFreeBeta(idea.tier);
  const text = args.text.trim(); if (!text && !args.finish) throw new ConvexError("Write an answer, or choose to create a draft now.");
  if (text.length > 4000) throw new ConvexError("Keep each answer under 4,000 characters.");
  if (text) { const policyError = founderInputError(text); if (policyError) {
    await ctx.db.insert("rejectedInputs", { owner: row.owner, email: viewer.email, ideaId: row._id, tier: idea.tier, text, reason: policyError, source: "local", createdAt: Date.now() });
    idea.messages.push(makeMessage("assistant", policyError)); await save(ctx, row, idea); return;
  } }
  if (idea.messages.length >= 100) throw new ConvexError("This exploration has reached its conversation limit. Export it and start a new version.");
  let inputMessageId: string | undefined;
  if (text) { const message = makeMessage("user", text); inputMessageId = message.id; idea.messages.push(message); idea.answerCount += 1; }
  await enqueue(ctx, row, idea, !!args.finish, inputMessageId);
} });
export const retry = mutation({ args: idArgs, handler: async (ctx, args) => {
  const { row, idea } = await owned(ctx, args.id); requireIdle(idea); requireFreeBeta(idea.tier);
  if (idea.status !== "error") throw new ConvexError("There is no failed response to retry.");
  await enqueue(ctx, row, idea, row.runFinish || false); // Reuse saved answers; do not append them twice.
} });
export const upgrade = mutation({ args: { ...idArgs, tier: tierValidator, consent: v.boolean() }, handler: async (ctx, args) => {
  const { row, idea } = await owned(ctx, args.id); requireIdle(idea); requireFreeBeta(args.tier);
  if (tierRank(args.tier) <= tierRank(idea.tier)) throw new ConvexError("Choose a deeper level. Your current work will be preserved.");
  if (!args.consent) throw new ConvexError("Please allow AI-led web research for this level.");
  idea.tier = args.tier; idea.researchConsent = true;
  idea.messages.push(makeMessage("system", `Founder upgraded to ${TIERS[args.tier].label}. Keep previous answers, edits, completed experiments, and decisions. Ask new, deeper questions rather than repeating earlier ones.`));
  await enqueue(ctx, row, idea, false);
} });
export const editBlock = mutation({ args: { ...idArgs, block: v.string(), items: v.array(v.object({ id: v.string(), text: v.string(), evidence: evidenceValidator, sourceIds: v.array(v.string()), edited: v.optional(v.boolean()) })) }, handler: async (ctx, args) => {
  const { row, idea } = await owned(ctx, args.id); requireIdle(idea);
  const block = BLOCKS.find(b => b.key === args.block); if (!block) throw new ConvexError("Unknown canvas section.");
  if (args.items.length > 12) throw new ConvexError("Keep each section to 12 concise points.");
  const sources = new Set(idea.reports.flatMap(r => r.sources.map(s => s.id)));
  const seen = new Set<string>();
  const items: CanvasItem[] = args.items.map(item => {
    if (!item.text.trim() || item.text.length > 1200 || item.id.length > 100 || !item.id || seen.has(item.id)) throw new ConvexError("Use unique, nonempty points under 1,200 characters.");
    seen.add(item.id); const sourceIds = item.sourceIds.filter(id => sources.has(id)).slice(0, 10);
    if (item.evidence === "research" && !sourceIds.length) throw new ConvexError("Research points need an existing research source. Use assumption for an unverified point.");
    return { ...item, text: item.text.trim(), sourceIds, edited: true };
  });
  idea.canvas[block.key] = items.length ? items : [{ id: uid(), text: "Left open by the founder; not yet decided", evidence: "assumption", sourceIds: [], edited: true }];
  idea.editedBlocks = [...new Set([...(idea.editedBlocks || []), block.key])]; await save(ctx, row, idea);
} });
export const rename = mutation({ args: { ...idArgs, title: v.string() }, handler: async (ctx, args) => {
  const { row, idea } = await owned(ctx, args.id); requireIdle(idea); const title = args.title.trim();
  if (!title || title.length > 100) throw new ConvexError("Use a name between 1 and 100 characters."); idea.title = title; idea.titleEdited = true; await save(ctx, row, idea);
} });
export const decide = mutation({ args: { ...idArgs, challengeId: v.string(), decision: v.union(v.literal("open"), v.literal("accept"), v.literal("revise"), v.literal("decline")) }, handler: async (ctx, args) => {
  const { row, idea } = await owned(ctx, args.id); requireIdle(idea);
  if (!idea.challenges.some(c => c.id === args.challengeId)) throw new ConvexError("This challenge no longer exists.");
  idea.challenges = idea.challenges.map(c => c.id === args.challengeId ? { ...c, decision: args.decision } : c); await save(ctx, row, idea);
} });
export const toggleExperiment = mutation({ args: { ...idArgs, experimentId: v.string() }, handler: async (ctx, args) => {
  const { row, idea } = await owned(ctx, args.id); requireIdle(idea);
  if (!idea.experiments.some(e => e.id === args.experimentId)) throw new ConvexError("This experiment no longer exists.");
  idea.experiments = idea.experiments.map(e => e.id === args.experimentId ? { ...e, done: !e.done } : e); await save(ctx, row, idea);
} });
export const cancel = mutation({ args: idArgs, handler: async (ctx, args) => {
  const { row, idea } = await owned(ctx, args.id);
  if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
  idea.status = "error"; idea.statusLabel = "Paused — your work is saved"; idea.error = "Response cancelled. Retry to continue with your saved answers.";
  await ctx.db.patch(row._id, { document: encode(idea), runToken: undefined, runMessageId: undefined, leaseUntil: 0, responseId: undefined });
} });
export const remove = mutation({ args: idArgs, handler: async (ctx, args) => {
  const { row } = await owned(ctx, args.id);
  if (row.responseId) await ctx.scheduler.runAfter(0, internal.runner.cancelResponse, { responseId: row.responseId });
  await ctx.db.delete(row._id);
} });
