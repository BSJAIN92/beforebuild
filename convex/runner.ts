"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { provider, researchReport, type ProviderResponse } from "./providers";
import { cleanError, type Idea } from "../lib/model";
interface WorkState { idea: Idea; stage: string; responseId?: string; finish: boolean; polls: number; researchKind?: string; }
export const work = internalAction({ args: { id: v.id("ideas"), token: v.string() }, handler: async (ctx, args): Promise<void> => {
  let responseToClean: string | undefined;
  try {
    const state = await ctx.runMutation(internal.jobs.claim, args) as WorkState | null;
    if (!state) return;
    const ai = provider(); const idea = state.idea;
    const kind = idea.tier === "advanced" ? "advanced" : "intermediate";
    const needsResearch = idea.tier !== "basic" && idea.researchConsent && (idea.answerCount >= 2 || state.finish) && !idea.reports.some(r => r.kind === idea.tier && !r.demo);
    let research: ProviderResponse | undefined;
    if (state.stage === "poll") {
      if (!state.responseId) throw new Error("The research job lost its provider reference. Retry to restart the job.");
      if (state.polls >= 120) throw new Error("Research reached the beta time limit. Your work is saved; please retry.");
      research = await ai.retrieve(state.responseId); responseToClean = state.responseId;
    } else if (state.stage === "start" && needsResearch) {
      const reserved = await ctx.runMutation(internal.jobs.reserveResearch, args);
      if (!reserved) return;
      research = await ai.startResearch(idea); responseToClean = research.id;
    } else if (state.stage === "research-started") {
      throw new Error("Research was interrupted before its reference could be saved. Please retry. Check provider usage before repeatedly retrying.");
    }
    if (research) {
      if (["queued", "in_progress"].includes(research.status)) {
        const active = await ctx.runMutation(internal.jobs.waitForResearch, { ...args, responseId: research.id, kind });
        if (!active) { await ai.cancel(research.id).catch(() => {}); await ai.remove(research.id).catch(() => {}); }
        responseToClean = undefined; return;
      }
      if (research.status !== "completed") throw new Error(`AI research ${research.status === "incomplete" ? "was incomplete" : "did not complete"}. Your answers are saved; please retry.`);
      const report = researchReport(research, kind);
      await ctx.runMutation(internal.jobs.storeResearch, { ...args, reportJson: JSON.stringify(report) });
      await ai.remove(research.id).catch(() => {}); responseToClean = undefined; return;
    }
    const turn = await ai.interview(idea, state.finish);
    await ctx.runMutation(internal.jobs.complete, { ...args, turnJson: JSON.stringify(turn) });
  } catch (error) {
    const internalMessage = error instanceof Error ? error.message.split("\n")[0].slice(0, 350) : "Unknown AI worker failure";
    console.error("AI worker failed", { name: error instanceof Error ? error.name : "UnknownError", message: internalMessage });
    const message = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? "The AI service timed out. Your answer is saved. Retry to continue; the previous provider request may still incur usage." : cleanError(error);
    await ctx.runMutation(internal.jobs.fail, { ...args, error: message });
    if (responseToClean) { try { const ai = provider(); await ai.cancel(responseToClean).catch(() => {}); await ai.remove(responseToClean).catch(() => {}); } catch { /* Credentials can fail during cleanup; never replace the original error. */ } }
  }
} });
export const cancelResponse = internalAction({ args: { responseId: v.string() }, handler: async (_ctx, { responseId }): Promise<void> => {
  try { const ai = provider(); await ai.cancel(responseId).catch(() => {}); await ai.remove(responseId).catch(() => {}); } catch { /* Best-effort cleanup; stale results can never overwrite saved data. */ }
} });
