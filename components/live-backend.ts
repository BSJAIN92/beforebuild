import type { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { Backend, Snapshot, Viewer } from "../lib/backend";
export interface LiveBackend extends Backend { push(snapshot: Snapshot): void; }
export function createLiveBackend(client: ConvexReactClient, viewer: Viewer, signOut: () => Promise<void>): LiveBackend {
  let data: Snapshot = { ideas: [], viewer, invites: [], pricing: { enabled: false, currency: "USD", intermediate: 0, advanced: 0 } };
  const listeners = new Set<() => void>(); const ideaId = (id: string) => id as Id<"ideas">;
  return {
    snapshot: () => data,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    push(next) { data = next; listeners.forEach(listener => listener()); },
    async create(description, tier, aiConsent, researchConsent) { const id = await client.mutation(api.ideas.create, { description, tier, aiConsent, researchConsent }) as string; data = { ...data, ideas: await client.query(api.ideas.list, {}) }; listeners.forEach(listener => listener()); return id; },
    async send(id, text, finish = false) { await client.mutation(api.ideas.send, { id: ideaId(id), text, finish }); },
    async editBlock(id, block, items) { await client.mutation(api.ideas.editBlock, { id: ideaId(id), block, items }); },
    async rename(id, title) { await client.mutation(api.ideas.rename, { id: ideaId(id), title }); },
    async remove(id) { await client.mutation(api.ideas.remove, { id: ideaId(id) }); },
    async upgrade(id, tier, consent) { await client.mutation(api.ideas.upgrade, { id: ideaId(id), tier, consent }); },
    async decide(id, challengeId, decision) { await client.mutation(api.ideas.decide, { id: ideaId(id), challengeId, decision }); },
    async toggleExperiment(id, experimentId) { await client.mutation(api.ideas.toggleExperiment, { id: ideaId(id), experimentId }); },
    async retry(id) { await client.mutation(api.ideas.retry, { id: ideaId(id) }); },
    async cancel(id) { await client.mutation(api.ideas.cancel, { id: ideaId(id) }); },
    async invite(email, active) { await client.mutation(api.access.setInvite, { email, active }); },
    async savePricing(pricing) { await client.mutation(api.settings.savePricing, pricing); },
    logout: signOut
  };
}
