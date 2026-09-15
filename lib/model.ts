export type Tier = "basic" | "intermediate" | "advanced";
export type Evidence = "founder" | "research" | "assumption";
export type ChallengeDecision = "open" | "accept" | "revise" | "decline";
export type Status = "draft" | "thinking" | "researching" | "ready" | "error";
export const BLOCKS = [
  { key: "partners", label: "Key partners", hint: "Who helps you make this work?", icon: "handshake" },
  { key: "activities", label: "Key activities", hint: "What must you do really well?", icon: "activity" },
  { key: "resources", label: "Key resources", hint: "What do you need to deliver?", icon: "layers" },
  { key: "value", label: "Value proposition", hint: "Why would someone choose you?", icon: "diamond" },
  { key: "relationships", label: "Customer relationships", hint: "How will you win and keep trust?", icon: "heart" },
  { key: "channels", label: "Channels", hint: "Where will customers find you?", icon: "megaphone" },
  { key: "customers", label: "Customer segments", hint: "Who has this problem?", icon: "users" },
  { key: "costs", label: "Cost structure", hint: "What will it cost to operate?", icon: "wallet" },
  { key: "revenue", label: "Revenue streams", hint: "What will customers pay for?", icon: "coins" }
] as const;
export type BlockKey = typeof BLOCKS[number]["key"];
export interface CanvasItem { id: string; text: string; evidence: Evidence; sourceIds: string[]; edited?: boolean; }
export type Canvas = Record<BlockKey, CanvasItem[]>;
export interface Source { id: string; title: string; url: string; accessedAt: number; }
export interface ResearchReport {
  id: string; kind: "intermediate" | "advanced"; text: string; sources: Source[];
  createdAt: number; demo: boolean;
}
export interface Challenge {
  id: string; title: string; detail: string; test: string;
  severity: "high" | "medium" | "low"; decision: ChallengeDecision;
  sourceIds: string[];
}
export interface Experiment {
  id: string; title: string; hypothesis: string; steps: string; metric: string;
  effort: string; priority: "high" | "medium" | "low"; done: boolean;
}
export interface Message { id: string; role: "user" | "assistant" | "system"; text: string; createdAt: number; }
export interface Idea {
  id: string; title: string; description: string; tier: Tier; titleEdited?: boolean; editedBlocks?: BlockKey[];
  createdAt: number; updatedAt: number; status: Status; statusLabel: string;
  messages: Message[]; canvas: Canvas; challenges: Challenge[]; experiments: Experiment[];
  reports: ResearchReport[]; answerCount: number; question: string; questionHint: string;
  suggestions: string[]; summary: string; error: string; aiConsent: boolean; researchConsent: boolean;
}
export interface TierConfig { label: string; min: number; max: number; description: string; research: string; }
export const TIERS: Record<Tier, TierConfig> = {
  basic: { label: "Basic", min: 3, max: 5, description: "Build a clear foundation.", research: "Customer, problem, workaround, and first test." },
  intermediate: { label: "Intermediate", min: 6, max: 10, description: "Examine the business model.", research: "Alternatives, acquisition, payment, delivery, and risk." },
  advanced: { label: "Advanced", min: 12, max: 18, description: "Pressure-test the opportunity.", research: "Switching, economics, retention, distribution, constraints, and counterevidence." }
};
export function emptyCanvas(): Canvas {
  return Object.fromEntries(BLOCKS.map(b => [b.key, []])) as unknown as Canvas;
}
export function uid(): string {
  // IDs are identifiers, never authentication secrets. This also works in deterministic Convex mutations.
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export function makeMessage(role: Message["role"], text: string): Message { return { id: uid(), role, text, createdAt: Date.now() }; }
export function createIdea(description: string, tier: Tier, _researchConsent: boolean, id = uid(), aiConsent = true): Idea {
  const now = Date.now();
  const title = description.trim().split(/\s+/).slice(0, 7).join(" ");
  const question = "Who is the very first kind of person you would help, and what frustrating task are they trying to get done?";
  return { id, title, description: description.trim(), tier, aiConsent, researchConsent: false, createdAt: now, updatedAt: now,
    status: "draft", statusLabel: "Let’s find the problem worth solving", canvas: emptyCanvas(),
    messages: [makeMessage("user", description.trim()), makeMessage("assistant", "Let’s start with the person, not the product. We’ll shape the business together, one question at a time.\n\n" + question)],
    challenges: [], experiments: [], reports: [], answerCount: 0, question,
    questionHint: "Be specific: “freelance designers chasing late invoices” is more useful than “small businesses.”",
    suggestions: [], summary: "", error: "" };
}
export function coverage(idea: Idea): number { return BLOCKS.filter(b => idea.canvas[b.key]?.length).length; }
export function evidenceCount(idea: Idea, type: Evidence): number { return Object.values(idea.canvas).flat().filter(i => i.evidence === type).length; }
export function isBusy(idea: Idea): boolean { return idea.status === "thinking" || idea.status === "researching"; }
export function tierRank(tier: Tier): number { return ["basic", "intermediate", "advanced"].indexOf(tier); }
export function needsResearch(idea: Idea): boolean {
  return false;
}
export function safeUrl(value: string): string | null {
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
export function cleanError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.replace(/\[CONVEX[^\]]*\]\s*/g, "").replace(/^.*?Uncaught (ConvexError|Error):\s*/s, "").replace(/Request ID:\s*[a-zA-Z0-9_-]+/gi, "");
    if (/OPENAI_API_KEY|AI service is not configured|credentials or model permissions|provider configuration/i.test(message)) {
      return "The AI service is temporarily unavailable. Your work is saved. Please try again later.";
    }
    return message.split("\n")[0].slice(0, 350);
  }
  return "Something went wrong. Your last saved work is safe. Please try again.";
}
