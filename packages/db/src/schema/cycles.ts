import { pgTable, text, timestamp, uuid, date, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userCycleSettings = pgTable("user_cycle_settings", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: "cascade" }),
    averageCycleLength: integer("average_cycle_length").default(28).notNull(),
    averagePeriodLength: integer("average_period_length").default(5).notNull(),
    lastPeriodStart: date("last_period_start"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const cycles = pgTable("cycles", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    isPrediction: boolean("is_prediction").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const cycleLogs = pgTable("cycle_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    flowIntensity: text("flow_intensity"), // light, medium, heavy, spotting
    symptoms: jsonb("symptoms").default([]), // cramps, headache, etc.
    mood: text("mood"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
