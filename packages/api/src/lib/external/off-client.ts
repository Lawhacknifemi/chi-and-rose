export interface OFFProduct {
    barcode: string;
    name?: string;
    brand?: string;
    category?: string;
    ingredientsRaw?: string;
    nutrition?: any;
    imageUrl?: string;
    source: string;
}

export class OpenFoodFactsClient {
    private baseUrl = "https://world.openfoodfacts.org/api/v2/product";

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
                nutrition: p.nutriscore_data || p.nutriments,
                imageUrl: p.image_url || p.image_front_url || p.image_small_url,
                source: "open_food_facts",
            };
        } catch (error) {
            console.error("OFF API Error (likely timeout):", error);
            return null;
        }
    }

    async searchProduct(query: string): Promise<OFFProduct | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            // Search API: https://world.openfoodfacts.org/cgi/search.pl
            const params = new URLSearchParams({
                search_terms: query,
                search_simple: "1",
                action: "process",
                json: "1",
                page_size: "1"
            });

            const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) return null;

            const data = await response.json() as any;
            if (!data.products || data.products.length === 0) return null;

            const p = data.products[0];
            return {
                barcode: p.code || "unknown",
                name: p.product_name,
                brand: p.brands,
                category: p.categories,
                ingredientsRaw: p.ingredients_text,
                nutrition: p.nutriscore_data || p.nutriments,
                imageUrl: p.image_url || p.image_front_url || p.image_small_url,
                source: "open_food_facts",
            };
        } catch (error) {
            console.error("OFF Search Error:", error);
            return null;
        }
    }
}
