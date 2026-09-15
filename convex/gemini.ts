"use node";
import { GoogleGenAI } from "@google/genai";
import type { Interactions } from "@google/genai";
import { interviewInstructions, parseTurn, TURN_SCHEMA, type Turn } from "../lib/ai-contract";
import { safeUrl, TIERS, uid, type Idea } from "../lib/model";
import { interviewInput, researchBrief, researchInstructions } from "./providerContext";
import type { AIProvider, ProviderResponse } from "./providers";

type GeminiErrorEnvelope = { status?: unknown; statusCode?: unknown; code?: unknown; message?: unknown; body?: unknown; error?: { status?: unknown; message?: unknown; error?: { status?: unknown; message?: unknown } } };
export interface ProviderErrorDiagnostic { provider: string; httpStatus: number; providerStatus: string; category: string; message: string; }
export class ProviderRequestError extends Error { constructor(message: string, readonly diagnostic: ProviderErrorDiagnostic) { super(message); this.name = "ProviderRequestError"; } }
const safeProviderStatuses = new Set(["INVALID_ARGUMENT", "FAILED_PRECONDITION", "NOT_FOUND", "PERMISSION_DENIED", "RESOURCE_EXHAUSTED", "UNAUTHENTICATED", "UNAVAILABLE"]);
function bodyEnvelope(value: unknown): GeminiErrorEnvelope | undefined {
  const body = value && typeof value === "object" ? (value as GeminiErrorEnvelope).body : undefined;
  if (typeof body !== "string") return body && typeof body === "object" ? body as GeminiErrorEnvelope : undefined;
  try { const parsed: unknown = JSON.parse(body); return parsed && typeof parsed === "object" ? parsed as GeminiErrorEnvelope : undefined; } catch { return undefined; }
}
function redactApiKeys(value: string, configuredKey: string): string {
  let result = value;
  if (configuredKey) result = result.split(configuredKey).join("[REDACTED_API_KEY]");
  return result
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/((?:api[_ -]?key|x-goog-api-key)["'\s:=]+)[^\s,;}"']+/gi, "$1[REDACTED_API_KEY]")
    .slice(0, 2000);
}
function safeErrorDetails(code: number, value: unknown, configuredKey: string): ProviderErrorDiagnostic {
  const envelope = value && typeof value === "object" ? value as GeminiErrorEnvelope : undefined;
  const body = bodyEnvelope(value);
  const rawMessage = typeof body?.error?.message === "string" ? body.error.message : typeof body?.message === "string" ? body.message : typeof envelope?.message === "string" ? envelope.message : typeof envelope?.error?.message === "string" ? envelope.error.message : envelope?.error?.error?.message;
  const message = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";
  const rawStatus = typeof body?.error?.status === "string" ? body.error.status : typeof body?.status === "string" ? body.status : typeof envelope?.status === "string" ? envelope.status : typeof envelope?.error?.status === "string" ? envelope.error.status : envelope?.error?.error?.status;
  const statusFromMessage = [...safeProviderStatuses].find(item => message.includes(item.toLowerCase()));
  const status = typeof rawStatus === "string" && safeProviderStatuses.has(rawStatus) ? rawStatus : statusFromMessage || "UNKNOWN";
  const category = message.includes("api key") || message.includes("credential") ? "credentials"
    : message.includes("model") ? "model"
    : message.includes("safety") ? "safety-setting"
    : message.includes("schema") ? "response-schema"
    : message.includes("system_instruction") || message.includes("system instruction") ? "system-instruction"
    : message.includes("max_output_tokens") || message.includes("max output tokens") ? "output-limit"
    : message.includes("generation_config") || message.includes("generation config") ? "generation-config"
    : message.includes("contents") || message.includes("content") ? "contents"
    : message.includes("quota") || message.includes("rate") ? "quota"
    : "unclassified";
  return { provider: "gemini", httpStatus: code, providerStatus: status, category, message: redactApiKeys(typeof rawMessage === "string" ? rawMessage : "Google returned no diagnostic message.", configuredKey) };
}

function validModel(value: string): string {
  const model = value.startsWith("models/") ? value.slice("models/".length) : value;
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(model)) throw new Error("The Gemini model setting is invalid.");
  return model;
}

function textParts(data: Interactions.Interaction): Interactions.TextContent[] {
  const last = [...(data.steps || [])].reverse().find((step): step is Interactions.ModelOutputStep => step.type === "model_output");
  return (last?.content || []).filter((item): item is Interactions.TextContent => item.type === "text");
}

function candidateText(data: Interactions.Interaction): string {
  const text = (data.output_text || textParts(data).map(part => part.text).join("\n")).trim();
  if (!text) throw new Error("The AI returned an empty or invalid response. Your work is saved; please retry.");
  return text;
}

export class GeminiProvider implements AIProvider {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const key = process.env.GEMINI_API_KEY || "";
    if (!key) throw new Error("The AI service is not configured. Ask the beta owner to set GEMINI_API_KEY on Convex.");
    this.ai = new GoogleGenAI({ apiKey: key });
    this.model = validModel(process.env.GEMINI_MODEL || "gemini-3.8-flash");
  }

  private async generate(body: Omit<Interactions.CreateModelInteractionParamsNonStreaming, "model" | "stream">, model = this.model): Promise<Interactions.Interaction> {
    const request: Interactions.CreateModelInteractionParamsNonStreaming = { ...body, model: validModel(model), stream: false };
    try {
      const result = await this.ai.interactions.create(request, { timeout: 105000, maxRetries: 0 });
      if (result && typeof result === "object" && Symbol.asyncIterator in result) throw new Error("The AI service returned an unexpected streamed response.");
      return result as Interactions.Interaction;
    }
    catch (error) {
      if (error instanceof Error && error.name.toLowerCase().includes("timeout")) { const timeout = new Error("The AI request timed out."); timeout.name = "TimeoutError"; throw timeout; }
      const envelope = error && typeof error === "object" ? error as GeminiErrorEnvelope : undefined;
      const code = typeof envelope?.status === "number" ? envelope.status : typeof envelope?.statusCode === "number" ? envelope.statusCode : typeof envelope?.code === "number" ? envelope.code : 0;
      const details = safeErrorDetails(code, error, process.env.GEMINI_API_KEY || ""); console.error("Gemini request rejected", { ...details, message: "Stored in the admin-only provider error table." });
      const publicMessage = code === 429 ? "The AI service is at its rate or spending limit. Your answer is saved. Retry after the provider limit clears." : code === 401 || code === 403 ? "The AI service rejected its credentials or model permissions. Ask the beta owner to check the provider configuration." : code === 400 || code === 404 ? "The AI service rejected the configured model or tool. Ask the beta owner to verify the Gemini settings." : code ? `The AI service could not complete the request (HTTP ${code}). Your work is saved; please retry.` : "The AI service could not complete the request. Your work is saved; please retry.";
      throw new ProviderRequestError(publicMessage, details);
    }
  }

  async interview(idea: Idea, finish: boolean): Promise<Turn> {
    const data = await this.generate({
      input: JSON.stringify(interviewInput(idea)),
      system_instruction: `${interviewInstructions(idea, finish)}\nThe complete nested JSON schema is: ${JSON.stringify(TURN_SCHEMA)}`,
      response_format: { type: "text", mime_type: "application/json", schema: TURN_SCHEMA },
      generation_config: { max_output_tokens: 6000 },
      store: false
    });
    const turn = parseTurn(candidateText(data), finish || idea.answerCount >= TIERS[idea.tier].min);
    if (!turn.complete && !finish && turn.question.length < 5) throw new Error("The AI did not return a useful next question. Please retry.");
    return turn;
  }

  async startResearch(idea: Idea): Promise<ProviderResponse> {
    if (idea.tier === "basic" || !idea.researchConsent) throw new Error("Research is not permitted for this idea.");
    const data = await this.generate({
      input: JSON.stringify(researchBrief(idea)),
      system_instruction: researchInstructions(idea),
      tools: [{ type: "google_search" }],
      generation_config: { max_output_tokens: idea.tier === "advanced" ? 20000 : 7000 },
      store: false
    });
    const text = candidateText(data);
    const annotations = textParts(data).flatMap(part => (part.annotations || []).flatMap(annotation => {
      if (annotation.type !== "url_citation" || !annotation.url || !Number.isInteger(annotation.start_index) || !Number.isInteger(annotation.end_index)) return [];
      const url = safeUrl(annotation.url); return url ? [{ type: "url_citation", url, title: annotation.title || new URL(url).hostname, start_index: annotation.start_index!, end_index: annotation.end_index! }] : [];
    }));
    return { id: `gemini-${uid()}`.slice(0, 200), status: "completed", output: [{ content: [{ type: "output_text", text, annotations }] }] };
  }

  async retrieve(_id: string): Promise<ProviderResponse> { throw new Error("Gemini research does not use background retrieval."); }
  async cancel(_id: string): Promise<void> { /* Gemini requests complete inline; stale-result protection remains in Convex. */ }
  async remove(_id: string): Promise<void> { /* No provider-side stored response exists. */ }
}
