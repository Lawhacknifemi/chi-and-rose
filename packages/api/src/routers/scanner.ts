import { z } from "zod";
import { db, productsCache, scans } from "@chi-and-rose/db";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";
import { OpenFoodFactsClient } from "../lib/external/off-client";
import { OpenBeautyFactsClient } from "../lib/external/obf-client";
import { EvaluationEngine } from "../lib/engine/evaluation";

const offClient = new OpenFoodFactsClient();
const obfClient = new OpenBeautyFactsClient();

export const scanBarcode = protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .handler(async ({ input, context }) => {
        const { barcode } = input;

        // 1. Check Cache
        let product = await db.query.productsCache.findFirst({
            where: eq(productsCache.barcode, barcode),
        });

        // 2. Fetch from External if not in cache
        if (!product) {
            // Try Food first, then Beauty
            let externalProduct = await offClient.getProduct(barcode);
            if (!externalProduct) {
                externalProduct = await obfClient.getProduct(barcode);
            }

            if (externalProduct) {
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
                    })
                    .returning();
                product = newProduct;
            }
        }

        if (!product) {
            throw new Error("Product not found");
        }

        // 3. Record Scan
        await db.insert(scans).values({
            userId: context.session.user.id,
            barcode,
        });

        // 4. Normalize & Analyze
        const normalizedIngredients = EvaluationEngine.normalizeIngredients(product.ingredientsRaw || "");
        const analysis = await EvaluationEngine.analyze(
            context.session.user.id,
            normalizedIngredients,
            product.category || "unknown"
        );

        return {
            product: {
                name: product.name,
                brand: product.brand,
                ingredients: product.ingredientsRaw,
            },
            analysis,
        };
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
