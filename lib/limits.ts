import type { Tier } from "./model";
export type UsageKind = "turns" | "research";
export type UsageField = "basicTurns" | "intermediateTurns" | "advancedTurns" | "intermediateResearch" | "advancedResearch";
export interface UsageConfig { field: UsageField; env: string; fallback: number; ceiling: number; }
export type UsageLimitOverrides = Partial<Record<UsageField, number>>;
export const USAGE_LIMITS: Record<Tier, Partial<Record<UsageKind, UsageConfig>>> = {
  basic: { turns: { field: "basicTurns", env: "AI_BASIC_DAILY_TURNS", fallback: 10, ceiling: 500 } },
  intermediate: {
    turns: { field: "intermediateTurns", env: "AI_INTERMEDIATE_DAILY_TURNS", fallback: 15, ceiling: 500 },
    research: { field: "intermediateResearch", env: "AI_INTERMEDIATE_DAILY_RESEARCH", fallback: 1, ceiling: 20 }
  },
  advanced: {
    turns: { field: "advancedTurns", env: "AI_ADVANCED_DAILY_TURNS", fallback: 22, ceiling: 500 },
    research: { field: "advancedResearch", env: "AI_ADVANCED_DAILY_RESEARCH", fallback: 1, ceiling: 20 }
  }
};
export function resolveUsageLimit(tier: Tier, kind: UsageKind, environment: Record<string, string | undefined>, overrides: UsageLimitOverrides = {}): number {
  const config = USAGE_LIMITS[tier][kind]; if (!config) return 0;
  const value = Number(overrides[config.field] ?? environment[config.env] ?? config.fallback);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, config.ceiling) : config.fallback;
}
