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
}
