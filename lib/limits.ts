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
export function resolveGeminiDailyLimit(environment: Record<string, string | undefined>): number {
  const value = Number(environment.GEMINI_MAX_DAILY_REQUESTS ?? 250);
  return Number.isSafeInteger(value) && value >= 1 && value <= 500 ? value : 250;
}
export function geminiQuotaDay(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
