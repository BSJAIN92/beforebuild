import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  ideas: defineTable({
    owner: v.string(), email: v.string(), title: v.string(), updatedAt: v.number(), document: v.string(),
    runToken: v.optional(v.string()), runStage: v.optional(v.string()), runStartedAt: v.optional(v.number()),
    runFinish: v.optional(v.boolean()), leaseUntil: v.optional(v.number()),
    responseId: v.optional(v.string()), researchKind: v.optional(v.string()), polls: v.optional(v.number())
  }).index("by_owner", ["owner", "updatedAt"]),
  invites: defineTable({ email: v.string(), active: v.boolean(), updatedAt: v.number(), updatedBy: v.string() }).index("by_email", ["email"]),
  settings: defineTable({ key: v.string(), enabled: v.boolean(), currency: v.string(), intermediate: v.number(), advanced: v.number() }).index("by_key", ["key"]),
  usage: defineTable({ owner: v.string(), day: v.string(), turns: v.number(), research: v.number() }).index("by_owner_day", ["owner", "day"])
});
