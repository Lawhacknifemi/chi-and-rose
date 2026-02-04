import type { OFFProduct } from "./off-client";

export class OpenBeautyFactsClient {
    private baseUrl = "https://world.openbeautyfacts.org/api/v2/product";

    async getProduct(barcode: string): Promise<OFFProduct | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`${this.baseUrl}/${barcode}.json`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) return null;

            const data = await response.json() as any;
            if (data.status !== 1) return null;

            const p = data.product;
            return {
                barcode,
                name: p.product_name,
                brand: p.brands,
                category: p.categories,
                ingredientsRaw: p.ingredients_text,
                nutrition: p.nutriments,
                imageUrl: p.image_url || p.image_front_url || p.image_small_url,
                source: "open_beauty_facts",
            };
        } catch (error) {
            console.error("OBF API Error (likely timeout):", error);
            return null;
        }
    }

    async searchProduct(name: string): Promise<OFFProduct | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for search

            // Search query
            const searchUrl = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1`;

            const response = await fetch(searchUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) return null;

            const data = await response.json() as any;
            if (!data.products || data.products.length === 0) return null;

            // Find first product with ingredients
            const match = data.products.find((p: any) => p.ingredients_text);

            if (!match) return null;

            // Return it mapped to our format
            // Note: We don't have the original barcode if we found via search, but we might want to return 
            // the SEARCH RESULTS barcode, or keep the original? 
            // In Scanner context, we want the INGREDIENTS.
            return {
                barcode: match.code, // The barcode of the MATCHED product
                name: match.product_name,
                brand: match.brands,
                category: match.categories,
                ingredientsRaw: match.ingredients_text,
                nutrition: match.nutriments,
                imageUrl: match.image_url || match.image_front_url || match.image_small_url,
                source: "open_beauty_facts_search",
            };

        } catch (error) {
            console.error("OBF Search Error:", error);
            return null;
        }
    }
}
