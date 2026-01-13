import type { OFFProduct } from "./off-client";

export class OpenBeautyFactsClient {
    private baseUrl = "https://world.openbeautyfacts.org/api/v2/product";

    async getProduct(barcode: string): Promise<OFFProduct | null> {
        try {
            const response = await fetch(`${this.baseUrl}/${barcode}.json`);
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
                nutrition: p.nutriments, // Beauty products might not have nutriscore
                source: "open_beauty_facts",
            };
        } catch (error) {
            console.error("OBF API Error:", error);
            return null;
        }
    }
}
