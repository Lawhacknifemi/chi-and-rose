import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userProfiles = pgTable("user_profile", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: "cascade" }),
    conditions: text("conditions").array().notNull().default([]),
    symptoms: text("symptoms").array().notNull().default([]),
    goals: text("goals").array().notNull().default([]),
    dietaryPreferences: text("dietary_preferences").array().notNull().default([]),
    sensitivities: text("sensitivities").array().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
