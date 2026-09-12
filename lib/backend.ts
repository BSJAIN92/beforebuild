import type { CanvasItem, BlockKey, ChallengeDecision, Idea, Tier } from "./model";
export interface Viewer { email: string; name: string; admin: boolean; demo: boolean; }
export interface Invite { email: string; active: boolean; }
export interface Pricing { enabled: boolean; currency: string; intermediate: number; advanced: number; }
export interface Snapshot { storageAvailable?: boolean; ideas: Idea[]; viewer: Viewer; pricing: Pricing; invites: Invite[]; }
export interface Backend {
  snapshot(): Snapshot;
  subscribe(callback: () => void): () => void;
  create(description: string, tier: Tier, aiConsent: boolean, researchConsent: boolean): Promise<string>;
  send(id: string, text: string, finish?: boolean): Promise<void>;
  editBlock(id: string, block: BlockKey, items: CanvasItem[]): Promise<void>;
  rename(id: string, title: string): Promise<void>;
  remove(id: string): Promise<void>;
  upgrade(id: string, tier: Tier, consent: boolean): Promise<void>;
  decide(id: string, challengeId: string, decision: ChallengeDecision): Promise<void>;
  toggleExperiment(id: string, experimentId: string): Promise<void>;
  retry(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  invite(email: string, active: boolean): Promise<void>;
  savePricing(pricing: Pricing): Promise<void>;
  logout(): Promise<void>;
  seedExample?(): Promise<string>;
}
