import { pgTable, text, real, uuid } from "drizzle-orm/pg-core";

export const ingredientRules = pgTable("ingredient_rule", {
    id: uuid("id").primaryKey().defaultRandom(),
    ingredientName: text("ingredient_name").notNull().unique(),
    tags: text("tags").array().notNull().default([]), // endocrine_disruptor, inflammatory, etc.
    avoidFor: text("avoid_for").array().notNull().default([]), // conditions
    cautionFor: text("caution_for").array().notNull().default([]), // symptoms
    explanation: text("explanation"),
    confidence: real("confidence").notNull().default(1.0),
});
