import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const productsCache = pgTable("products_cache", {
    barcode: text("barcode").primaryKey(),
    source: text("source").notNull(), // open_food_facts, open_beauty_facts
    name: text("name"),
    brand: text("brand"),
    category: text("category"),
    ingredientsRaw: text("ingredients_raw"),
    ingredientsParsed: jsonb("ingredients_parsed").$type<string[]>(),
    nutrition: jsonb("nutrition"),
    imageUrl: text("image_url"),
    lastAnalysis: jsonb("last_analysis").$type<any>(), // Stores full analysis result
    lastFetched: timestamp("last_fetched").defaultNow().notNull(),
});

export const scans = pgTable("scan", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    barcode: text("barcode").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
