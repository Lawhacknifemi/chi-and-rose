import { db, ingredientRules, userProfiles } from "@chi-and-rose/db";
import { eq, inArray } from "drizzle-orm";
import { aiService } from "../../services/ai";

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
    riskCategories?: any; // Keeping lenient for now to avoid duplicative typing
    positives: string[];
    alternatives: any[];
}

export class EvaluationEngine {
    /**
     * Normalizes raw ingredient text.
     * Improvements:
     * - Removes parentheses (e.g., "Water (Aqua)" -> "Water")
     * - Trims whitespace
     * - Lowercases
     */
    static normalizeIngredients(raw: string): string[] {
        if (!raw) return [];
        return raw
            .split(",")
            .map((i) => {
                // Remove content in parentheses, e.g., "Water (Aqua)" -> "Water"
                const clean = i.replace(/\(.*\)/g, "").trim();
                return clean.toLowerCase();
            })
            .filter((i) => i.length > 0);
    }

    static async analyze(
        userId: string,
        ingredients: string[],
        productName: string = "Unknown Product",
        skipAi: boolean = false
    ): Promise<ProductAnalysis> {
        // 1. Fetch user profile
        let profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, userId),
        });

        if (!profile) {
            // Fallback for Guest/Testing
            profile = {
                userId: userId,
                conditions: [],
                symptoms: [],
                sensitivities: [],
                goals: ["General Health"],
            } as any;
        }

        // Ensure profile is not null for TS
        const safeProfile = profile!; // We assigned a fallback above

        // 2. Fetch rules (Baseline Rule Engine)
        const rules = await db.query.ingredientRules.findMany({
            where: inArray(ingredientRules.ingredientName, ingredients),
        });

        let score = 100;
        const concerns: IngredientConcern[] = [];
        const positives: string[] = [];

        // 3. Apply Deterministic Rules
        for (const rule of rules) {
            // Avoid for conditions
            const avoidConditions = rule.avoidFor.filter((c) => safeProfile.conditions.includes(c));
            if (avoidConditions.length > 0) {
                concerns.push({
                    ingredient: rule.ingredientName,
                    reason: `Avoid for ${avoidConditions.join(", ")}: ${rule.explanation}`,
                    severity: "Avoid",
                });
                score -= 30;
            }

            // Caution for symptoms
            const cautionSymptoms = rule.cautionFor.filter((s) => safeProfile.symptoms.includes(s));
            if (cautionSymptoms.length > 0) {
                concerns.push({
                    ingredient: rule.ingredientName,
                    reason: `Caution for ${cautionSymptoms.join(", ")}: ${rule.explanation}`,
                    severity: "Caution",
                });
                score -= 15;
            }

            // Sensitivities
            if (safeProfile.sensitivities.includes(rule.ingredientName)) {
                concerns.push({
                    ingredient: rule.ingredientName,
                    reason: `Matches your sensitivity to ${rule.ingredientName}`,
                    severity: "Avoid",
                });
                score -= 50;
            }
        }

        // 3b. Apply Heuristic Checks (Pattern Matching for undetected toxins)
        const heuristicConcerns = this.detectHeuristicConcerns(ingredients);
        for (const h of heuristicConcerns) {
            // Deduplicate
            if (!concerns.find(c => c.ingredient === h.ingredient)) {
                concerns.push(h);
                score -= 25; // Significant penalty for potential toxins
            }
        }

        // 4. AI Enhancement (The "Doctor's Opinion")
        let aiSummary: string | undefined;
        let aiRiskCategories: any | undefined;

        if (!skipAi) {
            // ... (profileContext setup) ...
            const profileContext = `
                Conditions: ${safeProfile.conditions.join(", ")}
                Symptoms: ${safeProfile.symptoms.join(", ")}
                Sensitivities: ${safeProfile.sensitivities.join(", ")}
                Goals: ${safeProfile.goals.join(", ")}
            `;

            try {
                // We verify with AI mainly for the summary and edge cases the rules missed
                const aiResult = await aiService.analyzeIngredients(ingredients, profileContext);
                aiSummary = aiResult.summary;
                aiRiskCategories = aiResult.riskCategories;

                if (aiResult.concerns.length > 0) {
                    for (const aiConcern of aiResult.concerns) {
                        // Only add if not already caught by rules (simple check by ingredient name)
                        if (!concerns.find(c => c.ingredient.toLowerCase() === aiConcern.ingredient.toLowerCase())) {
                            concerns.push(aiConcern);
                            score -= (aiConcern.severity === "Avoid" ? 20 : 10);
                        }
                    }
                }

                // Trust AI positives
                if (aiResult.positives) {
                    positives.push(...aiResult.positives);
                }
            } catch (e) {
                console.error("AI verify failed, falling back to rules only", e);
            }
        }

        // ... (score normalization) ...
        score = Math.max(0, Math.min(100, score));

        let safetyLevel: "Good" | "Caution" | "Avoid" = "Good";
        if (score < 50) safetyLevel = "Avoid";
        else if (score < 80) safetyLevel = "Caution";

        // 5. Generate Alternatives (always suggest similar/better options)
        let alternatives: any[] = [];
        if (!skipAi) {
            const avoidedIngredients = concerns.map(c => c.ingredient);
            alternatives = await aiService.suggestAlternatives(productName, avoidedIngredients);
        }

        return {
            overallSafetyScore: score,
            safetyLevel,
            summary: aiSummary || this.generateSummary(safetyLevel, concerns),
            concerns,
            riskCategories: aiRiskCategories,
            positives,
            alternatives,
        };
    }

    private static detectHeuristicConcerns(ingredients: string[]): IngredientConcern[] {
        const concerns: IngredientConcern[] = [];

        for (const ing of ingredients) {
            // Endocrine Disruptors
            if (ing.includes("paraben")) {
                concerns.push({
                    ingredient: ing,
                    reason: "Potential Endocrine Disruptor (Paraben)",
                    severity: "Avoid",
                });
            }
            if (ing.includes("phthalate")) {
                concerns.push({
                    ingredient: ing,
                    reason: "Potential Endocrine Disruptor (Phthalate)",
                    severity: "Avoid",
                });
            }
            if (ing.includes("triclosan")) {
                concerns.push({
                    ingredient: ing,
                    reason: "Potential Endocrine Disruptor",
                    severity: "Avoid",
                });
            }
        }
        return concerns;
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
