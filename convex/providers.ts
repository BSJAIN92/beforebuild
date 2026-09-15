"use node";
import { interviewInstructions, parseTurn, TURN_SCHEMA, type Turn } from "../lib/ai-contract";
import { safeUrl, TIERS, uid, type Idea, type ResearchReport, type Source } from "../lib/model";
import { interviewInput, researchBrief, researchInstructions } from "./providerContext";
import { GeminiProvider } from "./gemini";
export interface ProviderResponse {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "cancelled" | "incomplete";
  output?: { type?: string; content?: { type?: string; text?: string; annotations?: { type?: string; url?: string; title?: string; start_index?: number; end_index?: number }[] }[] }[];
}
export interface AIProvider {
  interview(idea: Idea, finish: boolean): Promise<Turn>;
  startResearch(idea: Idea): Promise<ProviderResponse>;
  retrieve(id: string): Promise<ProviderResponse>;
  cancel(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}
function textOutput(response: ProviderResponse): string {
  return (response.output || []).flatMap(o => o.content || []).filter(c => c.type === "output_text" && c.text).map(c => c.text!).join("\n\n");
}
function responseId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new Error("The provider returned an invalid response identifier.");
  return encodeURIComponent(id);
}
class OpenAIProvider implements AIProvider {
  private readonly base: string;
  private readonly key: string;
  constructor() {
    this.key = process.env.OPENAI_API_KEY || "";
    if (!this.key) throw new Error("The AI service is not configured. Ask the beta owner to set OPENAI_API_KEY on Convex.");
    this.base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const url = new URL(this.base);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("OPENAI_BASE_URL must be an HTTPS Responses API endpoint without credentials or query parameters.");
  }
  private async request(path: string, options: RequestInit = {}): Promise<ProviderResponse> {
    const response = await fetch(this.base + path, { ...options, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(105000) });
    if (!response.ok) {
      // Never return raw provider responses: they may contain request content or configuration.
      const code = response.status;
      throw new Error(code === 429 ? "The AI service is at its rate or spending limit. Your answer is saved. Retry after the provider limit clears." : code === 401 || code === 403 ? "The AI service rejected its credentials or model permissions. Ask the beta owner to check the provider configuration." : code === 400 || code === 404 ? "The AI service rejected the configured model or tool. Ask the beta owner to verify the Responses API settings." : `The AI service could not complete the request (HTTP ${code}). Your work is saved; please retry.`);
    }
    if (response.status === 204) return { id: "", status: "completed" };
    const data = await response.json() as ProviderResponse;
    return data;
  }
  async interview(idea: Idea, finish: boolean): Promise<Turn> {
    const response = await this.request("/responses", { method: "POST", body: JSON.stringify({
      model: process.env.AI_INTERVIEW_MODEL || "gpt-4.1-mini", store: false,
      instructions: interviewInstructions(idea, finish), input: JSON.stringify(interviewInput(idea)),
      max_output_tokens: 6000,
      text: { format: { type: "json_schema", name: "business_model_turn", strict: true, schema: TURN_SCHEMA } }
    }) });
    if (response.status !== "completed") throw new Error("The AI response was interrupted or incomplete. Your answer is saved; please retry.");
    const turn = parseTurn(textOutput(response), finish || idea.answerCount >= TIERS[idea.tier].min);
    if (!turn.complete && !finish && turn.question.length < 5) throw new Error("The AI did not return a useful next question. Please retry.");
    return turn;
  }
  async startResearch(idea: Idea): Promise<ProviderResponse> {
    const advanced = idea.tier === "advanced";
    if (idea.tier === "basic" || !idea.researchConsent) throw new Error("Research is not permitted for this idea.");
    return this.request("/responses", { method: "POST", body: JSON.stringify({
      model: advanced ? process.env.AI_DEEP_RESEARCH_MODEL || "o3-deep-research" : process.env.AI_RESEARCH_MODEL || "gpt-4.1",
      instructions: researchInstructions(idea), input: JSON.stringify(researchBrief(idea)), background: true, store: true,
      tools: [{ type: advanced ? process.env.AI_DEEP_SEARCH_TOOL || "web_search_preview" : "web_search" }],
      ...(advanced ? {} : { tool_choice: "required" }), max_tool_calls: advanced ? 35 : 7, max_output_tokens: advanced ? 20000 : 7000
    }) });
  }
  retrieve(id: string) { return this.request(`/responses/${responseId(id)}`); }
  async cancel(id: string) { await this.request(`/responses/${responseId(id)}/cancel`, { method: "POST", body: "{}" }); }
  async remove(id: string) { await this.request(`/responses/${responseId(id)}`, { method: "DELETE" }); }
}
export function provider(): AIProvider {
  const name = process.env.AI_PROVIDER || "openai";
  if (name === "openai" || name === "openai-compatible") return new OpenAIProvider();
  if (name === "gemini") return new GeminiProvider();
  throw new Error("The configured AI provider is not supported.");
}
export function researchReport(response: ProviderResponse, kind: "intermediate" | "advanced"): ResearchReport {
  if (response.status !== "completed") throw new Error("Research did not complete successfully.");
  const sources: Source[] = []; const urls = new Map<string, Source>(); const parts: string[] = [];
  for (const output of response.output || []) for (const content of output.content || []) {
    if (content.type !== "output_text" || !content.text) continue;
    let text = content.text;
    const replacements: { start: number; end: number; text: string }[] = [];
    for (const annotation of content.annotations || []) {
      if (annotation.type !== "url_citation" || !annotation.url) continue;
      const url = safeUrl(annotation.url); if (!url) continue;
      let source = urls.get(url);
      if (!source) {
        source = { id: uid(), url, title: (annotation.title || new URL(url).hostname).slice(0, 350), accessedAt: Date.now() };
        urls.set(url, source); sources.push(source);
      }
      if (Number.isInteger(annotation.start_index) && Number.isInteger(annotation.end_index) && annotation.start_index! >= 0 && annotation.end_index! <= text.length && annotation.end_index! >= annotation.start_index!) {
        replacements.push({ start: annotation.start_index!, end: annotation.end_index!, text: `[${source.title.replace(/[\[\]\n]/g, "")}](${url})` });
      }
    }
    // Apply source annotation offsets to the original text, backwards, so indexes stay valid.
    let last = text.length + 1;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
      if (replacement.end > last) continue;
      text = text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end); last = replacement.start;
    }
    parts.push(text);
  }
  if (!sources.length) throw new Error("The research returned no verifiable source citations. No findings were saved as evidence. Please retry.");
  return { id: uid(), kind, text: parts.join("\n\n").slice(0, 110000), sources: sources.slice(0, 80), createdAt: Date.now(), demo: false };
}
