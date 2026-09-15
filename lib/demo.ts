import { createIdea, emptyCanvas, isBusy, makeMessage, normalizeEmail, tierRank, TIERS, uid, type BlockKey, type CanvasItem, type ChallengeDecision, type Idea, type Tier } from "./model";
import type { Backend, Pricing, Snapshot } from "./backend";
const STORAGE_KEY = "beforebuild.demo.v1";
const questions = [
  ["What happens today when this person encounters the problem?", "Think about their last real experience: what did they do, and what went wrong?", "value"],
  ["What would make solving this problem worth paying for?", "Saved time, recovered money, lower risk, or a better outcome? “Not sure yet” is a useful answer.", "revenue"],
  ["Where could you find five people like this to talk to?", "Think of a community, a personal connection, or a place they already spend time.", "channels"],
  ["What can you realistically put into this idea before you need it to earn money?", "Your available time, skills, budget, and income goal help keep the plan realistic.", "resources"],
  ["What do people use instead, including doing nothing?", "In live mode, AI-led research helps make this question specific to actual alternatives.", "activities"],
  ["Why would someone leave their current workaround for your approach?", "Try to name one specific improvement, not a longer feature list.", "value"],
  ["How would you test a price with a real potential customer?", "A paid pilot or a clear price offer is stronger evidence than “sounds interesting.”", "revenue"],
  ["What would make someone keep using this after their first month?", "Look for a recurring task, repeat value, or an outcome they would miss.", "relationships"],
  ["Which outside service or partner would be hardest to replace?", "Consider data access, platform permissions, distribution, and critical integrations.", "partners"],
  ["Which sign would convince you this problem is not urgent enough?", "Choose counterevidence you would take seriously before spending more on development.", "value"],
  ["Who actually approves paying for this solution?", "The person using a product is not always the person choosing it or paying for it.", "customers"],
  ["What would a customer need to move over from their current solution?", "Think about setup work, existing data, habits, risk, and confidence in a new provider.", "relationships"],
  ["How many customers could you personally reach in the next three months?", "Build a bottom-up estimate from a channel you can actually access. Label it as an estimate.", "channels"],
  ["What might it cost to serve one paying customer each month?", "Include AI or API usage, hosting, support time, payment fees, and any manual work.", "costs"],
  ["What evidence would show that customers return for the core value?", "Choose a meaningful repeat action, rather than page visits or sign-ups alone.", "activities"],
  ["What could a bigger existing tool copy quickly, and what advantage would remain?", "An advantage could be customer access, a narrow workflow, expertise, or trust.", "resources"],
  ["What is your smallest useful test before building the product?", "A manual service, a paid pilot, or a customer interview can test different assumptions.", "activities"],
  ["What result would make you proceed, revise, or stop?", "Write your decision rule now so enthusiasm does not move the goalposts later.", "value"]
] as const;
function item(text: string, evidence: CanvasItem["evidence"] = "assumption"): CanvasItem { return { id: uid(), text, evidence, sourceIds: [] }; }
export function seedIdea(): Idea {
  const idea = createIdea("A lightweight tool that helps freelance designers follow up on unpaid invoices without awkward client conversations.", "basic", false);
  idea.title = "Nudge";
  idea.answerCount = 2;
  idea.canvas = { ...emptyCanvas(),
    customers: [item("Freelance designers managing their own client billing", "founder")],
    value: [item("Gentle invoice follow-ups, without the awkward email", "founder"), item("Recover time spent checking and chasing unpaid invoices")],
    activities: [item("Send timely reminders and track invoice status")],
    resources: [item("A solo developer and a reliable email integration")],
    channels: [item("Design communities and freelancer newsletters")],
    relationships: [], partners: [], costs: [], revenue: [] };
  idea.messages = [
    makeMessage("user", idea.description),
    makeMessage("assistant", "Let’s start with the person, not the product. Who is the first kind of person you want to help?"),
    makeMessage("user", "Freelance designers who manage 3–10 clients and do their own invoicing."),
    makeMessage("assistant", "That is a useful starting group. What happens today when an invoice is overdue?"),
    makeMessage("user", "They check a spreadsheet, put off the awkward email, then write a follow-up from scratch."),
    makeMessage("assistant", "The task is clear. The next thing to learn is whether it is painful enough to pay to solve.\n\nWhat would make solving this problem worth paying for?")
  ];
  idea.question = questions[1][0]; idea.questionHint = questions[1][1];
  idea.challenges = [{ id: "pain", title: "A frustrating task is not always a paid problem", detail: "We have a plausible workflow, but no customer evidence yet that automated reminders are worth buying.", test: "Ask five freelance designers about the last overdue invoice, then offer a small manual pilot.", severity: "high", decision: "open", sourceIds: [] }];
  return idea;
}
export function demoTurn(idea: Idea, answer: string, finish = false): Idea {
  const next = structuredClone(idea);
  if (answer) {
    const key: BlockKey = next.answerCount === 0 ? "customers" : questions[Math.min(next.answerCount - 1, questions.length - 1)][2];
    if (!next.editedBlocks?.includes(key)) next.canvas[key].push(item(answer === "I’m not sure yet." ? "Still unknown — needs a customer test" : answer, answer === "I’m not sure yet." ? "assumption" : "founder"));
    next.answerCount += 1;
  }
  const proposals: Record<BlockKey, string> = {
    partners: "Start independently; confirm which platform or service partnerships are actually necessary",
    activities: "Understand the customer workflow, deliver one useful outcome, and support early users",
    resources: "Founder time, relevant skills, and a small operating budget; exact requirements untested",
    value: `Proposed benefit to test: ${next.description}`,
    relationships: "Direct onboarding and personal support for the first customers",
    channels: "Start with conversations in one accessible niche community",
    customers: "A narrowly defined group experiencing the described problem; segment still needs validation",
    costs: "Founder time, hosting, external services, and support; amounts not yet estimated",
    revenue: "Test willingness to pay with a small paid pilot before choosing a long-term price"
  };
  const staged: BlockKey[][] = [["value"], ["activities", "resources"], ["channels"], ["relationships", "partners"], ["costs", "revenue"]];
  for (const key of staged[Math.min(Math.max(next.answerCount - 1, 0), 4)]) if (!next.canvas[key].length) next.canvas[key] = [item(proposals[key])];
  const complete = finish || next.answerCount >= TIERS[next.tier].max;
  if (complete) for (const [key, value] of Object.entries(proposals)) if (!next.canvas[key as BlockKey].length) next.canvas[key as BlockKey] = [item(value)];
  const base = [{ id: "pain", title: "Is the problem urgent enough to solve?", detail: "The founder’s description is a starting hypothesis, not yet evidence of how often customers face this problem.", test: "Ask five relevant people about the last time they experienced the problem. Listen for recent, specific examples.", severity: "high" as const, decision: "open" as const, sourceIds: [] },
    { id: "payment", title: "Willingness to pay is still an assumption", detail: "A useful concept and positive feedback do not tell us whether someone will pay for it.", test: "Offer a clearly scoped paid pilot, state a real test price, and record commitments rather than compliments.", severity: "high" as const, decision: "open" as const, sourceIds: [] },
    { id: "reach", title: "Getting the first customers needs a repeatable path", detail: "An acquisition channel is currently a proposed route, not a proven source of customers.", test: "Contact a small, relevant audience through one accessible channel and track replies and qualified conversations.", severity: "medium" as const, decision: "open" as const, sourceIds: [] }];
  if (next.tier !== "basic") base.push({ id: "switch", title: "The current workaround may be good enough", detail: "The connected research should investigate alternatives. This demo has not verified any competitors or switching barriers.", test: "Ask potential customers to show their current workflow and identify what would justify changing it.", severity: "high", decision: "open", sourceIds: [] });
  if (next.tier === "advanced") base.push({ id: "economics", title: "A small business must work at a small scale", detail: "Support effort, serving costs, reachable customers, and retention have not been validated.", test: "Run a concierge pilot, log delivery time and variable costs, and check repeat use before automating.", severity: "high", decision: "open", sourceIds: [] });
  next.challenges = base.slice(0, Math.max(1, Math.min(next.answerCount, base.length))).map(c => ({ ...c, decision: next.challenges.find(old => old.id === c.id)?.decision || "open" }));
  if (complete) next.experiments = [
    { id: "interviews", title: "Have five problem conversations", hypothesis: "This target customer encounters a recent, recurring problem worth solving.", steps: "Find five relevant people. Ask about the last incident, what they did, what it cost, and what they already tried. Do not pitch first.", metric: "Example decision rule to customize: at least 3 of 5 describe a recent incident and an active workaround. This is qualitative learning, not statistical proof.", effort: "A few focused sessions", priority: "high", done: false },
    { id: "pilot", title: "Offer the outcome before the software", hypothesis: "Someone will pay for the proposed outcome.", steps: "Deliver a narrow version manually. State the scope and a test price. Ask for a paid pilot rather than feedback on a mockup.", metric: "Example decision rule to customize: 2 qualified prospects commit to a paid pilot. Record objections and revise if neither commits.", effort: "One small pilot", priority: "high", done: false },
    { id: "channel", title: "Test one path to the first customer", hypothesis: "You can reach this audience without expensive broad advertising.", steps: "Choose one relevant community or personal network. Start ten respectful, targeted conversations. Record responses and fit.", metric: "Example decision rule to customize: 3 qualified conversations from 10 personalized contacts; assess the quality, not just the count.", effort: "One outreach cycle", priority: "medium", done: false }
  ].map(e => ({ ...e, priority: e.priority as "high" | "medium", done: next.experiments.find(old => old.id === e.id)?.done || false }));
  const q = questions[Math.min(Math.max(next.answerCount - 1, 0), questions.length - 1)];
  next.question = complete ? "" : q[0]; next.questionHint = q[1]; next.suggestions = [];
  next.summary = complete ? `A first business model for: ${next.description}\n\nStart by testing the customer problem, willingness to pay, and a reachable acquisition channel. Treat proposed operating choices as assumptions. This local demo uses a scripted coaching flow, not AI analysis.` : "";
  next.status = complete ? "ready" : "draft"; next.statusLabel = complete ? "Your canvas is ready to test" : "Your next question is ready";
  next.error = ""; next.updatedAt = Date.now();
  next.messages.push(makeMessage("assistant", complete ? "Your first canvas is ready. A filled canvas is not the finish line: the assumptions and validation plan show what to test before building. You can edit any block, disagree with a challenge, or go deeper." : `I’ve added that to the draft, keeping what we know separate from what still needs testing.\n\n${q[0]}`));
  return next;
}
export function createDemoBackend(): Backend {
  let data: Snapshot = { ideas: [], viewer: { email: "founder@demo.local", name: "Alex", admin: true, demo: true }, pricing: { enabled: false, currency: "USD", intermediate: 0, advanced: 0 }, usageLimits: { basicTurns: 10, intermediateTurns: 15, intermediateResearch: 1, advancedTurns: 22, advancedResearch: 1 }, invites: [], waitlist: [], support: [] };
  let persistenceError = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Snapshot;
      if (Array.isArray(parsed.ideas) && parsed.ideas.every(i => i && typeof i.id === "string" && typeof i.description === "string" && i.canvas && Array.isArray(i.messages))) {
        data = { ...data, ideas: parsed.ideas, pricing: parsed.pricing || data.pricing, usageLimits: parsed.usageLimits || data.usageLimits, invites: parsed.invites || [], waitlist: parsed.waitlist || [], support: parsed.support || [] };
        data.ideas = data.ideas.map(i => isBusy(i) ? { ...i, status: "draft", statusLabel: "Resumed from your last save" } : i);
      }
    }
  } catch { persistenceError = true; }
  const listeners = new Set<() => void>();
  const emit = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { persistenceError = true; } listeners.forEach(fn => fn()); };
  const get = (id: string) => { const i = data.ideas.find(i => i.id === id); if (!i) throw new Error("This idea was not found."); return i; };
  const update = (id: string, fn: (idea: Idea) => Idea) => { data.ideas = data.ideas.map(i => i.id === id ? fn(i) : i); emit(); };
  const tokens = new Map<string, string>();
  return {
    snapshot: () => ({ ...data, storageAvailable: !persistenceError }),
    subscribe(fn) { listeners.add(fn); if (persistenceError) console.warn("Local persistence is unavailable. Export your work before closing this tab."); return () => listeners.delete(fn); },
    async create(description, tier, _aiConsent, _researchConsent) {
      if (description.trim().length < 20) throw new Error("Give us at least 20 characters about the person, problem, or idea.");
      if (description.length > 5000) throw new Error("Keep the initial idea under 5,000 characters.");
      const idea = createIdea(description, tier, false, undefined, false); data.ideas.unshift(idea); emit(); return idea.id;
    },
    async send(id, text, finish = false) {
      const idea = get(id); if (isBusy(idea)) throw new Error("A response is already being prepared.");
      if (!text.trim() && !finish) return;
      if (text.length > 4000) throw new Error("Keep each answer under 4,000 characters.");
      const token = uid(); tokens.set(id, token);
      const pending = { ...idea, status: "thinking" as const, statusLabel: "Shaping your draft", messages: text.trim() ? [...idea.messages, makeMessage("user", text.trim())] : idea.messages };
      update(id, () => pending);
      await new Promise(resolve => setTimeout(resolve, 450));
      if (tokens.get(id) !== token || !data.ideas.some(i => i.id === id)) return;
      update(id, () => demoTurn(pending, text.trim(), finish));
    },
    async editBlock(id, block, items) { if (isBusy(get(id))) throw new Error("Finish the current turn before editing."); update(id, i => ({ ...i, editedBlocks: [...new Set([...(i.editedBlocks || []), block])], canvas: { ...i.canvas, [block]: (items.length ? items : [{ id: uid(), text: "Left open by the founder; not yet decided", evidence: "assumption" as const, sourceIds: [] }]).map(x => ({ ...x, edited: true })) }, updatedAt: Date.now() })); },
    async rename(id, title) { update(id, i => ({ ...i, title: title.trim().slice(0, 100), titleEdited: true, updatedAt: Date.now() })); },
    async remove(id) { tokens.delete(id); data.ideas = data.ideas.filter(i => i.id !== id); emit(); },
    async upgrade(id, tier, _consent) {
      const i = get(id); if (isBusy(i)) throw new Error("Finish the current turn before changing level.");
      if (tierRank(tier) <= tierRank(i.tier)) throw new Error("Choose a deeper level. Existing work is kept.");
      update(id, i => ({ ...i, tier, researchConsent: false, reports: [], status: "draft", statusLabel: "Ready to go deeper", question: questions[Math.min(i.answerCount, questions.length - 1)][0], questionHint: questions[Math.min(i.answerCount, questions.length - 1)][1], messages: [...i.messages, makeMessage("assistant", `You’re now exploring at ${TIERS[tier].label} level. Your work is kept.\n\n${questions[Math.min(i.answerCount, questions.length - 1)][0]}`)] }));
    },
    async decide(id, challengeId, decision) { update(id, i => ({ ...i, challenges: i.challenges.map(c => c.id === challengeId ? { ...c, decision } : c) })); },
    async toggleExperiment(id, experimentId) { update(id, i => ({ ...i, experiments: i.experiments.map(e => e.id === experimentId ? { ...e, done: !e.done } : e) })); },
    async retry(id) { update(id, i => ({ ...i, status: "draft", error: "" })); },
    async cancel(id) { tokens.delete(id); update(id, i => ({ ...i, status: "draft", statusLabel: "Paused — your work is saved" })); },
    async invite(email, active) { email = normalizeEmail(email); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address."); data.invites = [...data.invites.filter(i => i.email !== email), { email, active }]; emit(); },
    async updateSupportStatus(id, status) { data.support = data.support.map(item => item.id === id ? { ...item, status, updatedAt: Date.now() } : item); emit(); },
    async savePricing(pricing: Pricing) { if (pricing.enabled) throw new Error("Checkout is not implemented. Billing must stay disabled."); data.pricing = { ...pricing, enabled: false }; emit(); },
    async saveUsageLimits(limits) { data.usageLimits = { ...limits }; emit(); },
    async logout() { /* Local demo has no authenticated session. */ },
    async seedExample() { const existing = data.ideas.find(i => i.title === "Nudge"); if (existing) return existing.id; const idea = seedIdea(); data.ideas.unshift(idea); emit(); return idea.id; }
  };
}
