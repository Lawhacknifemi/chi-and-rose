import { db } from "../src/index";
import { ingredientRules } from "../src/schema";

async function seed() {
    console.log("Seeding ingredient rules...");

    const rules = [
        {
            ingredientName: "red 40",
            tags: ["synthetic_color", "potential_carcinogen"],
            avoidFor: ["ADHD", "Hyperactivity"],
            cautionFor: ["Sensitive Skin"],
            explanation: "Artificial food dye linked to hyperactivity in children.",
        },
        {
            ingredientName: "parabens",
            tags: ["endocrine_disruptor", "preservative"],
            avoidFor: ["PCOS", "Endometriosis", "Fibroids"],
            cautionFor: ["Acne"],
            explanation: "May mimic estrogen and disrupt hormonal balance.",
        },
        {
            ingredientName: "sodium laureth sulfate",
            tags: ["surfactant", "irritant"],
            avoidFor: [],
            cautionFor: ["Sensitive Skin", "Dry Skin", "Eczema"],
            explanation: "Can be harsh and irritating to the skin barrier.",
        },
        {
            ingredientName: "high fructose corn syrup",
            tags: ["refined_sugar", "inflammatory"],
            avoidFor: ["Diabetes", "Inflammation"],
            cautionFor: ["Bloating"],
            explanation: "Highly processed sugar that can cause blood sugar spikes.",
        },
        {
            ingredientName: "palm oil",
            tags: ["saturated_fat", "environmental_impact"],
            avoidFor: [],
            cautionFor: ["High Cholesterol"],
            explanation: "High in saturated fats; significant environmental concerns.",
        },
    ];

    for (const rule of rules) {
        await db
            .insert(ingredientRules)
            .values(rule)
            .onConflictDoUpdate({
                target: ingredientRules.ingredientName,
                set: rule,
            });
    }

    console.log("✓ Seeded sample ingredient rules.");
}

seed().catch(console.error);
