"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { provider } from "./providers";
import { cleanError, type Idea } from "../lib/model";
import { requireAIEnabled } from "./guards";
import { ProviderRequestError } from "./gemini";
import { AIResponseValidationError, interviewInstructions } from "../lib/ai-contract";
import { interviewInput } from "./providerContext";
interface WorkState { idea: Idea; stage: string; responseId?: string; finish: boolean; polls: number; researchKind?: string; inputMessageId?: string; }
export const work = internalAction({ args: { id: v.id("ideas"), token: v.string() }, handler: async (ctx, args): Promise<void> => {
  let responseToClean: string | undefined;
  let workState: WorkState | null = null;
  try {
    const state = await ctx.runMutation(internal.jobs.claim, args) as WorkState | null; workState = state;
    if (!state) return;
    requireAIEnabled();
    const ai = provider(); const idea = state.idea;
    // Research provider methods remain available for a future product review, but the active product is interview-only.
    if (!await ctx.runMutation(internal.jobs.reserveGeminiRequest, args)) return;
    const turn = await ai.interview(idea, state.finish);
    await ctx.runMutation(internal.jobs.complete, { ...args, turnJson: JSON.stringify(turn) });
  } catch (error) {
    if (error instanceof ProviderRequestError) await ctx.runMutation(internal.jobs.recordProviderError, { ...args, ...error.diagnostic, operation: "interview-or-research" });
    if (error instanceof AIResponseValidationError && workState) await ctx.runMutation(internal.jobs.recordAIResponseError, { ...args, provider: process.env.AI_PROVIDER || "openai", model: (process.env.AI_PROVIDER === "gemini" ? process.env.GEMINI_MODEL : process.env.AI_INTERVIEW_MODEL) || "default", operation: "interview", tier: workState.idea.tier, answerCount: workState.idea.answerCount, finish: workState.finish, message: error.message, prompt: JSON.stringify({ instructions: interviewInstructions(workState.idea, workState.finish), input: interviewInput(workState.idea) }), ...error.diagnostic });
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
