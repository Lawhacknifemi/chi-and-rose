import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@chi-and-rose/env/server";
import { OpenFoodFactsClient } from "../lib/external/off-client";
import { OpenBeautyFactsClient } from "../lib/external/obf-client";

export interface AIAnalysisResult {
    overallSafetyScore: number;
    safetyLevel: "Good" | "Caution" | "Avoid";
    summary: string;
    concerns: Array<{
        ingredient: string;
        reason: string;
        severity: "Caution" | "Avoid";
    }>;
    riskCategories?: {
        carcinogens: { status: "Safe" | "Risk"; description: string };
        hormone_disruptors: { status: "Safe" | "Risk"; description: string };
        allergens: { status: "Safe" | "Risk"; description: string };
        reproductive_toxicants: { status: "Safe" | "Risk"; description: string };
        developmental_toxicants: { status: "Safe" | "Risk"; description: string };
        banned_ingredients: { status: "Safe" | "Risk"; description: string };
    };
    positives: string[];
}

export interface AIAlternative {
    productName: string;
    brand: string;
    reason: string;
    buyLink?: string;
    imageUrl?: string;
}

export interface AIDailyInsight {
    title: string;
    message: string;
    actionableTip: string;
}

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;
    private offClient = new OpenFoodFactsClient();
    private obfClient = new OpenBeautyFactsClient();

    constructor() {
        if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.warn("GOOGLE_GENERATIVE_AI_API_KEY is not set. AI features will be disabled.");
            return;
        }
        this.genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY);
        // Validated by user and debug script
        this.model = this.genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        console.log("AI Service initialized with key: " + env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 4) + "...");
    }

    private async findProductImage(brand: string, name: string): Promise<string | null> {
        const queries = [
            `${brand} ${name}`,
            `${brand} ${name.split(" ")[0]}`,
            brand
        ];

        for (const q of queries) {
            // Try Food DB
            let res = await this.offClient.searchProduct(q);
            if (res?.imageUrl) return res.imageUrl;

            // Try Beauty DB
            res = await this.obfClient.searchProduct(q);
            if (res?.imageUrl) return res.imageUrl;
        }
        return null;
    }

    async analyzeIngredients(ingredients: string[], userProfileContext: string): Promise<AIAnalysisResult> {
        if (!this.model) {
            return this.mockAnalysis();
        }

        try {
            const prompt = `
            Analyze this list of ingredients for a cosmetic/food product based on the user's health profile.
            
            Ingredients: ${ingredients.join(", ")}
            User Profile: ${userProfileContext}

            CRITICAL: You are a strict toxicologist. 
            Analyze specifically for:
            1. Carcinogens
            2. Hormone Disruptors (Endocrine Disruptors)
            3. Allergens
            4. Reproductive Toxicants
            5. Developmental Toxicants
            6. Banned Ingredients

            CONTEXTUALIZE: If an ingredient is a Hormone Disruptor (e.g. Phthalates, Parabens, BPA) and the user has hormonal conditions (PCOS, Endometriosis, Fibroids):
            - You MUST explain the mechanism. Example: "Parabens mimic estrogen, potentially worsening estrogen-dominant conditions like Endometriosis."
            - Do not just say "Avoid". Explain *Why* based on their condition.

            Return a strict JSON object with the following structure:
            {
                "overallSafetyScore": number (0-100),
                "safetyLevel": "Good" | "Caution" | "Avoid",
                "summary": "General summary....",
                "riskCategories": {
                    "carcinogens": { "status": "Safe" | "Risk", "description": "Details or 'No evidence found'" },
                    "hormone_disruptors": { "status": "Safe" | "Risk", "description": "Details or 'No known endocrine-disrupting chemicals'" },
                    "allergens": { "status": "Safe" | "Risk", "description": "Details or 'No common allergens found'" },
                    "reproductive_toxicants": { "status": "Safe" | "Risk", "description": "Details or 'No major concerns identified'" },
                    "developmental_toxicants": { "status": "Safe" | "Risk", "description": "Details or 'No major concerns identified'" },
                    "banned_ingredients": { "status": "Safe" | "Risk", "description": "Details or 'All ingredients comply with safety regulations'" }
                },
                "concerns": [{ "ingredient": "name", "reason": "brief explanation", "severity": "Caution" | "Avoid" }],
                "positives": ["list of good ingredients"]
            }
            Do not include Markdown formatting in the response, just the raw JSON string.
            `;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // cleanup potential markdown code blocks
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(jsonStr) as AIAnalysisResult;

        } catch (error: any) {
            console.error("AI Analysis Failed:", error.message);
            if (error.message?.includes("404") || error.message?.includes("Not Found")) {
                console.error("HINT: This usually means the 'Generative Language API' is not enabled in your Google Cloud Project, or the model 'gemini-pro' is restricted for this key.");
            }
            return this.mockAnalysis();
        }
    }



    async suggestAlternatives(productName: string, avoidedIngredients: string[]): Promise<AIAlternative[]> {
        if (!this.model) return [];

        try {
            const prompt = `
            Suggest 3 healthy alternative products for "${productName}" that DO NOT contain: ${avoidedIngredients.join(", ")}.
            
            Return a strict JSON array:
            [
                { 
                    "productName": "Name", 
                    "brand": "Brand Name",
                    "reason": "Why it is better"
                }
            ]
            Do not include Markdown formatting.
            `;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const rawAlternatives = JSON.parse(jsonStr) as any[];

            // Post-processing to add metadata & images
            const enrichedAlternatives = await Promise.all(rawAlternatives.map(async (alt: any) => {
                const query = encodeURIComponent(`${alt.brand} ${alt.productName}`);
                let imageUrl = `https://placehold.co/400x400.png?text=${encodeURIComponent(alt.productName.substring(0, 20))}`;

                const realImage = await this.findProductImage(alt.brand || "", alt.productName);
                if (realImage) {
                    imageUrl = realImage;
                }

                return {
                    productName: alt.productName,
                    brand: alt.brand || "Unknown Brand",
                    reason: alt.reason,
                    buyLink: `https://www.google.com/search?tbm=shop&q=${query}`,
                    imageUrl: imageUrl,
                };
            }));

            return enrichedAlternatives;
        } catch (error) {
            console.error("AI Alternatives Failed:", error);
            return [];
        }
    }

    async generateDailyInsight(userProfileContext: string): Promise<AIDailyInsight> {
        if (!this.model) {
            return {
                title: "Stay Healthy!",
                message: "Remember to check product labels today.",
                actionableTip: "Scan everything before you buy."
            };
        }

        try {
            const prompt = `
            Generate a short, personalized daily wellness insight for a user with this profile:
            ${userProfileContext}

            Return a strict JSON object:
            {
                "title": "Catchy short title",
                "message": "1-2 sentences of encouragement or insight",
                "actionableTip": "One specific small action to take today"
            }
            Do not include Markdown formatting.
            `;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(jsonStr) as AIDailyInsight;
        } catch (error) {
            console.error("AI Daily Insight Failed:", error);
            return {
                title: "Daily Wellness",
                message: "Small steps lead to big changes.",
                actionableTip: "Drink water and stay mindful of what you use."
            };
        }
    }

    async getRecommendations(
        scannedProducts: Array<{ name: string; brand: string; category?: string }>,
        userProfileContext: string
    ): Promise<any[]> {
        if (!this.model) return [];
        if (scannedProducts.length === 0) return [];

        try {
            // Deduplicate and summarize context
            const uniqueProducts = Array.from(new Set(scannedProducts.map(p => `${p.brand} ${p.name}`))).slice(0, 10);

            const prompt = `
            The user has recently scanned these products:
            ${uniqueProducts.join(", ")}

            User Health Profile:
            ${userProfileContext}

            Based on their interest and health profile:
            Suggest 5 highly-rated, safe products that would be good alternatives or complements.
            Focus on clean, non-toxic options.
            
            Return a strict JSON array:
            [
                { 
                    "productName": "Name", 
                    "brand": "Brand Name",
                    "category": "Category (e.g. Moisturizer)",
                    "reason": "Personalized reason based on their history"
                }
            ]
            Do not include Markdown formatting.
            `;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const rawRecs = JSON.parse(jsonStr) as any[];

            // Post-processing to add images
            const enrichedRecs = await Promise.all(rawRecs.map(async (rec: any) => {
                const query = encodeURIComponent(`${rec.brand} ${rec.productName}`);
                let imageUrl = `https://placehold.co/400x400.png?text=${encodeURIComponent(rec.productName.substring(0, 20))}`;

                const realImage = await this.findProductImage(rec.brand || "", rec.productName);
                if (realImage) {
                    imageUrl = realImage;
                }

                return {
                    productName: rec.productName,
                    brand: rec.brand || "Unknown Brand",
                    category: rec.category,
                    reason: rec.reason,
                    buyLink: `https://www.google.com/search?tbm=shop&q=${query}`,
                    imageUrl: imageUrl,
                };
            }));

            return enrichedRecs;

        } catch (error) {
            console.error("AI Recommendations Failed:", error);
            return [];
        }
    }

    private mockAnalysis(): AIAnalysisResult {
        return {
            overallSafetyScore: 85,
            safetyLevel: "Good",
            summary: "Analysis unavailable (AI Key missing). Showing mock data.",
            concerns: [],
            riskCategories: {
                carcinogens: { status: "Safe", description: "No evidence found" },
                hormone_disruptors: { status: "Safe", description: "No known endocrine-disrupting chemicals" },
                allergens: { status: "Safe", description: "No common allergens found" },
                reproductive_toxicants: { status: "Safe", description: "No major concerns" },
                developmental_toxicants: { status: "Safe", description: "No major concerns" },
                banned_ingredients: { status: "Safe", description: "Compliant with safety regulations" }
            },
            positives: ["Natural Ingredients"]
        };
    }
}

export const aiService = new AIService();
