import { db, ingredientRules, userProfiles } from "@chi-and-rose/db";
import { eq, inArray } from "drizzle-orm";

export interface IngredientConcern {
    ingredient: string;
    reason: string;
    severity: "Caution" | "Avoid";
}

export interface ProductAnalysis {
    overallSafetyScore: number;
    safetyLevel: "Good" | "Caution" | "Avoid";
    summary: string;
    concerns: IngredientConcern[];
    positives: string[];
    alternatives: any[];
}

export class EvaluationEngine {
    /**
     * Normalizes raw ingredient text.
     * In a real app, this would use an LLM or a large dictionary.
     * For the initial implementation, we'll use simple cleaning.
     */
    static normalizeIngredients(raw: string): string[] {
        if (!raw) return [];
        return raw
            .split(/[,;.]/)
            .map((i) => i.trim().toLowerCase())
            .filter((i) => i.length > 0);
    }

    static async analyze(
        userId: string,
        ingredients: string[],
        _category: string
    ): Promise<ProductAnalysis> {
        // 1. Fetch user profile
        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, userId),
        });

        if (!profile) {
            return this.defaultResponse("Please set up your health profile to get personalized insights.");
        }

        // 2. Fetch rules for these ingredients
        const rules = await db.query.ingredientRules.findMany({
            where: inArray(ingredientRules.ingredientName, ingredients),
        });

        let score = 100;
        const concerns: IngredientConcern[] = [];
        const positives: string[] = [];

        // 3. Apply Rules
        for (const rule of rules) {
            // Avoid for conditions

            const avoidConditions = rule.avoidFor.filter((c) => profile.conditions.includes(c));
            if (avoidConditions.length > 0) {
                concerns.push({
                    ingredient: rule.ingredientName,
                    reason: `Avoid for ${avoidConditions.join(", ")}: ${rule.explanation}`,
                    severity: "Avoid",
                });
                score -= 30;
            }

            // Caution for symptoms
            const cautionSymptoms = rule.cautionFor.filter((s) => profile.symptoms.includes(s));
            if (cautionSymptoms.length > 0) {
                concerns.push({
                    ingredient: rule.ingredientName,
                    reason: `Caution for ${cautionSymptoms.join(", ")}: ${rule.explanation}`,
                    severity: "Caution",
                });
                score -= 15;
            }

            // Sensitivities
            if (profile.sensitivities.includes(rule.ingredientName)) {
                concerns.push({
                    ingredient: rule.ingredientName,
                    reason: `Matches your sensitivity to ${rule.ingredientName}`,
                    severity: "Avoid",
                });
                score -= 50;
            }

        }

        // Normalized Score
        score = Math.max(0, Math.min(100, score));

        let safetyLevel: "Good" | "Caution" | "Avoid" = "Good";
        if (score < 50) safetyLevel = "Avoid";
        else if (score < 80) safetyLevel = "Caution";

        return {
            overallSafetyScore: score,
            safetyLevel,
            summary: this.generateSummary(safetyLevel, concerns),
            concerns,
            positives,
            alternatives: [], // To be implemented
        };
    }

    private static generateSummary(level: string, concerns: IngredientConcern[]): string {
        if (level === "Good" && concerns.length === 0) return "This product looks great for your profile!";
        if (level === "Caution") return `This product contains ${concerns.length} ingredients to be cautious of.`;
        return `Warning: This product contains ingredients you should avoid based on your health profile.`;
    }

    private static defaultResponse(summary: string): ProductAnalysis {
        return {
            overallSafetyScore: 0,
            safetyLevel: "Caution",
            summary,
            concerns: [],
            positives: [],
            alternatives: [],
        };
    }
}
