import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

/**
 * The learning lab backend: saved simulations ("experiments") and the per-user
 * mastery levels that light up the concept tree.
 *
 * Params and toggles are stored as JSON strings because their shape depends on
 * the simulation template — see src/lib/sim/templates.ts.
 */

export const listSimulations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("simulations")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(40);
    return rows.map((row) => ({
      _id: row._id,
      title: row.title,
      prompt: row.prompt,
      templateId: row.templateId,
      params: row.params,
      toggles: row.toggles,
      concepts: row.concepts,
      runs: row.runs,
      updatedAt: row.updatedAt,
    }));
  },
});

export const myMastery = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("mastery")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
  },
});

export const saveSimulation = mutation({
  args: {
    prompt: v.string(),
    title: v.string(),
    templateId: v.string(),
    params: v.string(),
    toggles: v.string(),
    concepts: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const now = Date.now();

    const existing = await ctx.db
      .query("simulations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const match = existing.find((row) => row.templateId === args.templateId);

    if (match) {
      await ctx.db.patch(match._id, {
        prompt: args.prompt,
        title: args.title,
        params: args.params,
        toggles: args.toggles,
        concepts: args.concepts,
        updatedAt: now,
      });
      return match._id;
    }

    return await ctx.db.insert("simulations", {
      userId,
      prompt: args.prompt,
      title: args.title,
      templateId: args.templateId,
      params: args.params,
      toggles: args.toggles,
      concepts: args.concepts,
      runs: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const patchSimulation = mutation({
  args: {
    id: v.id("simulations"),
    params: v.string(),
    toggles: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return;
    await ctx.db.patch(args.id, {
      params: args.params,
      toggles: args.toggles,
      updatedAt: Date.now(),
    });
  },
});

export const removeSimulation = mutation({
  args: { id: v.id("simulations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return;
    await ctx.db.delete(args.id);
  },
});

/**
 * Called (debounced) as the learner drags sliders. Each interaction nudges the
 * concepts that simulation teaches toward mastery.
 */
export const recordExperiments = mutation({
  args: {
    concepts: v.array(v.string()),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const amount = Math.max(0, Math.min(0.25, args.amount));
    if (amount === 0 || args.concepts.length === 0) return;
    const now = Date.now();

    const rows = await ctx.db
      .query("mastery")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const byConcept = new Map(rows.map((row) => [row.concept, row]));

    for (const concept of args.concepts) {
      const existing = byConcept.get(concept);
      if (existing) {
        await ctx.db.patch(existing._id, {
          level: Math.min(1, existing.level + amount),
          experiments: existing.experiments + 1,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("mastery", {
          userId,
          concept,
          level: Math.min(1, amount),
          experiments: 1,
          updatedAt: now,
        });
      }
    }
  },
});

/** Bump the run counter so the experiment index can show usage. */
export const markRun = mutation({
  args: { id: v.id("simulations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return;
    await ctx.db.patch(args.id, {
      runs: row.runs + 1,
      updatedAt: Date.now(),
    });
  },
});
