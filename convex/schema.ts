import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  ideas: defineTable({
    owner: v.string(), email: v.string(), title: v.string(), updatedAt: v.number(), document: v.string(),
    runToken: v.optional(v.string()), runStage: v.optional(v.string()), runStartedAt: v.optional(v.number()),
    runFinish: v.optional(v.boolean()), runMessageId: v.optional(v.string()), leaseUntil: v.optional(v.number()),
    responseId: v.optional(v.string()), researchKind: v.optional(v.string()), polls: v.optional(v.number())
  }).index("by_owner", ["owner", "updatedAt"]),
  invites: defineTable({ email: v.string(), active: v.boolean(), updatedAt: v.number(), updatedBy: v.string() }).index("by_email", ["email"]),
  settings: defineTable({ key: v.string(), enabled: v.boolean(), currency: v.string(), intermediate: v.number(), advanced: v.number() }).index("by_key", ["key"]),
  usage: defineTable({
    owner: v.string(), day: v.string(),
    basicTurns: v.optional(v.number()), intermediateTurns: v.optional(v.number()), advancedTurns: v.optional(v.number()),
    intermediateResearch: v.optional(v.number()), advancedResearch: v.optional(v.number()),
    turns: v.optional(v.number()), research: v.optional(v.number()) // Legacy shared counters; retained so existing development rows remain valid.
  }).index("by_owner_day", ["owner", "day"]),
  bursts: defineTable({ owner: v.string(), minute: v.number(), messages: v.number() }).index("by_owner_minute", ["owner", "minute"]).index("by_minute", ["minute"]),
  rejectedInputs: defineTable({ owner: v.string(), email: v.string(), ideaId: v.id("ideas"), tier: v.string(), text: v.string(), reason: v.string(), source: v.union(v.literal("local"), v.literal("moderation")), createdAt: v.number() })
    .index("by_created", ["createdAt"]).index("by_owner_created", ["owner", "createdAt"])
});
