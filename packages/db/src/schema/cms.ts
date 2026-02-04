import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const articles = pgTable("articles", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    content: text("content").notNull(), // Markdown or HTML content
    summary: text("summary"),
    imageUrl: text("image_url"),
    category: text("category").notNull(), // e.g., 'Health', 'Nutrition', 'Lifestyle'
    isPublished: boolean("is_published").default(false).notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const dailyTips = pgTable("daily_tips", {
    id: uuid("id").primaryKey().defaultRandom(),
    phase: text("phase").notNull(), // e.g., 'menstrual', 'follicular', 'ovulation', 'luteal'
    content: text("content").notNull(),
    actionableTip: text("actionable_tip"),
    category: text("category"), // e.g., 'Nutrition', 'Exercise', 'Mental Health'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
