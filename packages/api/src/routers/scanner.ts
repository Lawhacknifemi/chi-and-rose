import { z } from "zod";
import { db, productsCache, scans, eq, sql } from "@chi-and-rose/db";

// import { protectedProcedure } from "../index";
import { protectedProcedure, publicProcedure } from "../index"; // Ensure publicProcedure is imported
import { EvaluationEngine } from "../lib/engine/evaluation";
import { OpenBeautyFactsClient } from "../lib/external/obf-client";
import { OpenFoodFactsClient } from "../lib/external/off-client";
import { UpcItemDbClient } from "../lib/external/upc-client";
import { imageService } from "../services/image";

const offClient = new OpenFoodFactsClient();
const obfClient = new OpenBeautyFactsClient();
const upcClient = new UpcItemDbClient();

export const scanBarcode = publicProcedure
    .input(z.object({
        barcode: z.string(),
        suppressError: z.boolean().optional().default(false),
    }))
    .handler(async ({ input, context }) => {
        try {
            const { barcode, suppressError } = input;

            console.log("[Scanner] FORCED Input:", barcode);

            // DEBUG: Check what columns actually exist in the database
            try {
                const debugResult = await db.execute(sql`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'products_cache' 
                    ORDER BY ordinal_position
                `);
                console.log("[Scanner] DEBUG - Database columns:", debugResult.rows);
            } catch (debugErr) {
                console.error("[Scanner] DEBUG query failed:", debugErr);
            }

            // 1. Check Cache
            let product = await db.query.productsCache.findFirst({
                where: eq(productsCache.barcode, barcode),
            });

            // 1b. Cache Repair: If product exists but missing image, try to re-fetch to see if we can get one now.
            // This fixes the issue where old scans don't show images.
            if (product && !product.imageUrl) {
                console.log(`[Scanner] Product ${barcode} in cache but missing image. Re-fetching to repair...`);
                // Force re-fetch logic by clearing 'product' variable temporarily or just running the fetch block?
                // Safer to run a dedicated repair block or just treat it as "not found" to force re-fetch flow.
                // Let's treat as "not found" for this logic, but be careful not to overwrite good data with bad data.
                // Actually, let's just nullify 'product' to force the "Fetch from External" block to run.
                // If external fails, we still have the old DB record (we just won't update it).
                // But we need to make sure we don't THROW if external fails, instead just keep the old record.
                // Complexity: High.
                // Alternative: Just run the external fetch logic below.
                product = undefined;
            }

            // 2. Fetch from External if not in cache (or if we forced re-fetch)
            if (!product) {
                console.log(`[Scanner] Product ${barcode} not in cache (or repairing). Fetching from external...`);

                // Try Food first, then Beauty
                let externalProduct = await offClient.getProduct(barcode);
                console.log(`[Scanner] OFF Result: ${externalProduct ? "Found" : "Not Found"}`);

                if (!externalProduct) {
                    externalProduct = await obfClient.getProduct(barcode);
                    console.log(`[Scanner] OBF Result: ${externalProduct ? "Found" : "Not Found"}`);
                }

                if (!externalProduct) {
                    externalProduct = await upcClient.getProduct(barcode);
                    console.log(`[Scanner] UPC Result: ${externalProduct ? "Found" : "Not Found"}`);
                }

                // ... (Name Search Logic - Identical to before, omitting for brevity in diff if unchanged) ... 
                // 2b. Enhanced Ingredient Lookup via Name (if found but ingredients missing)
                if (externalProduct && !externalProduct.ingredientsRaw && externalProduct.name) {
                    console.log(`[Scanner] Product found (${externalProduct.source}) but missing ingredients. Attempting Name Search...`);
                    let query = externalProduct.name.split(" - ")[0];
                    query = query.replace(/\d+(\.\d+)?\s?(ml|fl\s?oz|oz|g|kg)/gi, "").trim();
                    const words = query.split(" ");
                    if (words.length > 5) {
                        query = words.slice(0, 5).join(" ");
                    }
                    const searchResult = await obfClient.searchProduct(query);
                    if (searchResult && searchResult.ingredientsRaw) {
                        console.log(`[Scanner] Name Search Success: Found ingredients for '${query}'`);
                        externalProduct.ingredientsRaw = searchResult.ingredientsRaw;
                    }
                }

                if (externalProduct) {
                    // CLOUDINARY UPLOAD HERE
                    if (externalProduct.imageUrl) {
                        externalProduct.imageUrl = await imageService.uploadFromUrl(externalProduct.imageUrl, barcode);
                    }

                    const [newProduct] = await db
                        .insert(productsCache)
                        .values({
                            barcode,
                            source: externalProduct.source,
                            name: externalProduct.name,
                            brand: externalProduct.brand,
                            category: externalProduct.category,
                            ingredientsRaw: externalProduct.ingredientsRaw,
                            nutrition: externalProduct.nutrition,
                            imageUrl: externalProduct.imageUrl,
                        })
                        .onConflictDoUpdate({
                            target: productsCache.barcode,
                            set: {
                                name: externalProduct.name,
                                brand: externalProduct.brand,
                                category: externalProduct.category,
                                ingredientsRaw: externalProduct.ingredientsRaw,
                                nutrition: externalProduct.nutrition,
                                imageUrl: externalProduct.imageUrl,
                                lastFetched: new Date(),
                            }
                        })
                        .returning();
                    product = newProduct;
                } else {
                    // If we were repairing (product was originally found but undefined now), we should probably revert to DB fetch.
                    // But simply checking DB again satisfies this.
                    product = await db.query.productsCache.findFirst({
                        where: eq(productsCache.barcode, barcode),
                    });
                }
            }

            if (!product) {
                if (suppressError) {
                    return { found: false, barcode } as const;
                }
                throw new Error("Product not found");
            }

            // 3. Record Scan
            await db.insert(scans).values({
                userId: context.session.user.id,
                barcode,
            });

            // 4. Normalize & Analyze
            let analysis;
            if (product.ingredientsRaw) {
                const normalizedIngredients = EvaluationEngine.normalizeIngredients(product.ingredientsRaw);
                analysis = await EvaluationEngine.analyze(
                    context.session.user.id,
                    normalizedIngredients,
                    product.name || "Unknown Product"
                );

                // SAVE UPDATE to Cache (Persist the Alternatives!)
                try {
                    console.log(`[scanBarcode] Persisting analysis for ${barcode}...`);
                    await db.update(productsCache)
                        .set({ lastAnalysis: analysis })
                        .where(eq(productsCache.barcode, barcode));
                    console.log(`[scanBarcode] Persistence SUCCESS.`);
                } catch (err) {
                    console.error(`[scanBarcode] Persistence FAILED:`, err);
                }
            } else {
                // Missing ingredients fallback
                analysis = {
                    overallSafetyScore: 0,
                    safetyLevel: "Caution" as const,
                    summary: "Ingredients list not available. Please verify product details or add ingredients manually.",
                    concerns: [],
                    positives: [],
                    alternatives: [],
                };
            }

            return {
                found: true,
                product: {
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    ingredients: product.ingredientsRaw,
                    imageUrl: product.imageUrl,
                },
                analysis,
            } as const;
        } catch (error: any) {
            console.error("[Scanner] ERROR:", error);
            console.error("[Scanner] ERROR Stack:", error.stack);
            console.error("[Scanner] ERROR Details:", JSON.stringify(error, null, 2));
            throw error;
        }
    });

export const getIngredientInsight = protectedProcedure
    .input(z.object({ name: z.string() }))
    .handler(async ({ input, context }) => {
        const analysis = await EvaluationEngine.analyze(context.session.user.id, [input.name.toLowerCase()], "ingredient");

        return {
            name: input.name,
            insight: analysis.concerns.find(c => c.ingredient === input.name.toLowerCase()) || null,
            safetyLevel: analysis.safetyLevel,
        };
    });


export const analyzeIngredients = protectedProcedure
    .input(
        z.union([
            // Direct input
            z.object({
                ingredients: z.array(z.string()),
                productName: z.string().optional().default('Test Product'),
            }),
            // Wrapped input (e.g. from some ORPC clients)
            z.object({
                json: z.object({
                    ingredients: z.array(z.string()),
                    productName: z.string().optional().default('Test Product'),
                })
            }).transform((data) => data.json)
        ])
    )
    .output(
        z.object({
            overallSafetyScore: z.number(),
            safetyLevel: z.enum(["Good", "Caution", "Avoid"]),
            summary: z.string(),
            concerns: z.array(z.object({
                ingredient: z.string(),
                reason: z.string(),
                severity: z.enum(["Caution", "Avoid"]),
            })),
            positives: z.array(z.string()),
            alternatives: z.array(z.any()),
        })
    )
    .handler(async ({ input, context }) => {
        const result = await EvaluationEngine.analyze(
            context.session.user.id,
            input.ingredients,
            input.productName
        );
        return {
            overallSafetyScore: result.overallSafetyScore,
            safetyLevel: result.safetyLevel,
            summary: result.summary || "",
            concerns: result.concerns,
            positives: result.positives,
            alternatives: result.alternatives,
        };
    });

export const getRecentScans = protectedProcedure
    .input(z.object({
        limit: z.number().optional().default(10),
    }))
    .output(
        z.array(
            z.object({
                id: z.string(),
                barcode: z.string(), // Added barcode
                scannedAt: z.date(),
                product: z.object({
                    name: z.string().nullable(),
                    brand: z.string().nullable(),
                    category: z.string().nullable(),
                    imageUrl: z.string().nullable().optional(),
                    ingredients: z.string().nullable().optional(),
                }).optional(),
                analysis: z.object({
                    score: z.number(),
                    safetyLevel: z.string(),
                    summary: z.string().optional(),
                    concerns: z.array(z.object({
                        ingredient: z.string(),
                        reason: z.string(),
                        severity: z.string(),
                    })).optional(),
                    riskCategories: z.any().optional(), // Added field
                    positives: z.array(z.string()).optional(),
                    alternatives: z.array(z.any()).optional(),
                }).optional(),
            })
        )
    )
    .handler(async ({ input, context }) => {
        const limit = input.limit || 10;
        console.log(`[getRecentScans] Fetching for User: ${context.session.user.id}, Limit: ${limit}`);

        // Use real session user
        const userId = context.session.user.id;
        console.log(`[getRecentScans] Fetching for User: ${userId}, Limit: ${limit}`);

        const recentScans = await db.query.scans.findMany({
            where: eq(scans.userId, userId),
            orderBy: (scans, { desc }) => [desc(scans.createdAt)],
            limit: limit,
        });

        console.log(`[getRecentScans] Found ${recentScans.length} raw scans.`);

        const results = [];
        for (const scan of recentScans) {
            const product = await db.query.productsCache.findFirst({
                where: eq(productsCache.barcode, scan.barcode),
            });

            let analysis = null;
            if (product && product.ingredientsRaw) {
                // Check if cached analysis is valid (has new schema)
                const cached = product.lastAnalysis as any;
                const isCacheValid = cached && cached.riskCategories;

                if (isCacheValid) {
                    analysis = cached;
                } else {
                    console.log(`[getRecentScans] Cache stale for ${scan.barcode} (missing riskCategories). Re-analyzing (Full AI)...`);
                    const normalized = EvaluationEngine.normalizeIngredients(product.ingredientsRaw);
                    const result = await EvaluationEngine.analyze(
                        context.session.user.id,
                        normalized,
                        product.name || "Unknown",
                        false // Force Full AI to ensure riskCategories are generated
                    );
                    analysis = {
                        score: result.overallSafetyScore,
                        safetyLevel: result.safetyLevel,
                        summary: result.summary,
                        concerns: result.concerns,
                        positives: result.positives,
                        alternatives: result.alternatives,
                        riskCategories: result.riskCategories,
                    };

                    // Optimistic update to cache in background to prevent re-generation next time
                    db.update(productsCache)
                        .set({ lastAnalysis: analysis })
                        .where(eq(productsCache.barcode, scan.barcode))
                        .catch(err => console.error("Background cache update failed", err));
                }
            }

            results.push({
                id: scan.id,
                barcode: scan.barcode,
                scannedAt: scan.createdAt,
                product: product ? {
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    imageUrl: product.imageUrl,
                    ingredients: product.ingredientsRaw,
                } : undefined,
                analysis: analysis || undefined
            });
        }
        return results;
    });

export const getProductDetails = protectedProcedure
    .input(z.object({
        barcode: z.string(),
    }))
    .output(
        z.object({
            product: z.object({
                name: z.string().nullable(),
                brand: z.string().nullable(),
                category: z.string().nullable(),
                imageUrl: z.string().nullable().optional(),
                ingredients: z.string().nullable().optional(),
            }),
            analysis: z.object({
                score: z.number(),
                safetyLevel: z.string(),
                summary: z.string().optional(),
                concerns: z.array(z.object({
                    ingredient: z.string(),
                    reason: z.string(),
                    severity: z.string(),
                })).optional(),
                riskCategories: z.any().optional(), // Allow this pass-through
                positives: z.array(z.string()).optional(),
                alternatives: z.array(z.any()).optional(),
            }),
        })
    )
    .handler(async ({ input, context }) => {
        const { barcode } = input;

        // 1. Fetch from Cache
        const product = await db.query.productsCache.findFirst({
            where: eq(productsCache.barcode, barcode),
        });

        if (!product || !product.ingredientsRaw) {
            throw new Error("Product not found or missing ingredients.");
        }

        // 2. Full Analysis (skipAi: false)
        console.log(`[getProductDetails] Running Full Analysis...`);
        const normalized = EvaluationEngine.normalizeIngredients(product.ingredientsRaw);
        const result = await EvaluationEngine.analyze(
            context.session.user.id,
            normalized,
            product.name || "Unknown",
            false // FULL AI MODE
        );

        console.log(`[getProductDetails] Saving analysis to DB... Alternatives: ${result.alternatives?.length}`);

        // SAVE UPDATE to Cache (Persist!)
        try {
            console.log(`[getProductDetails] Persisting analysis for ${barcode}...`);
            await db.update(productsCache)
                .set({
                    lastAnalysis: {
                        score: result.overallSafetyScore,
                        safetyLevel: result.safetyLevel,
                        summary: result.summary,
                        concerns: result.concerns,
                        positives: result.positives,
                        alternatives: result.alternatives,
                        riskCategories: result.riskCategories, // Add this
                    }
                })
                .where(eq(productsCache.barcode, barcode));
            console.log(`[getProductDetails] Persistence SUCCESS.`);
        } catch (err) {
            console.error(`[getProductDetails] Persistence FAILED:`, err);
        }

        return {
            product: {
                name: product.name,
                brand: product.brand,
                category: product.category,
                imageUrl: product.imageUrl,
                ingredients: product.ingredientsRaw,
            },
            analysis: {
                score: result.overallSafetyScore,
                safetyLevel: result.safetyLevel,
                summary: result.summary,
                concerns: result.concerns,
                positives: result.positives,
                alternatives: result.alternatives,
                riskCategories: result.riskCategories, // Add this
            },
        };
    });

export const createProduct = protectedProcedure
    .input(z.object({
        barcode: z.string(),
        name: z.string(),
        brand: z.string(),
        category: z.string(),
        ingredients: z.string(),
    }))
    .handler(async ({ input }) => {
        const { barcode, name, brand, category, ingredients } = input;

        // Upsert into cache (overwrite if exists)
        await db.insert(productsCache)
            .values({
                barcode,
                name,
                brand,
                category,
                ingredientsRaw: ingredients,
                source: "admin",
                lastFetched: new Date(),
            })
            .onConflictDoUpdate({
                target: productsCache.barcode,
                set: {
                    name,
                    brand,
                    category,
                    ingredientsRaw: ingredients,
                    source: "admin",
                    lastFetched: new Date(),
                }
            });

        return { success: true, barcode };
    });
