import type { OFFProduct } from "./off-client";

export class UpcItemDbClient {
    private baseUrl = "https://api.upcitemdb.com/prod/trial/lookup";

    async getProduct(barcode: string): Promise<OFFProduct | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`${this.baseUrl}?upc=${barcode}`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) return null;

            const data = await response.json() as any;
            if (!data.items || data.items.length === 0) return null;

            const item = data.items[0];

            // Heuristic to check if description contains ingredients
            let ingredientsRaw: string | undefined = undefined;
            if (item.description && item.description.toLowerCase().includes("ingredients:")) {
                // Try to extract content after "Ingredients:"
                const parts = item.description.split(/ingredients:/i);
                if (parts.length > 1) {
                    ingredientsRaw = parts[1].trim();
                }
            }

            return {
                barcode,
                name: item.title,
                brand: item.brand,
                category: item.category,
                ingredientsRaw: ingredientsRaw, // Often null for UPCitemdb
                source: "upcitemdb",
                nutrition: null,
            };
        } catch (error) {
            console.error("UPCitemdb API Error:", error);
            return null;
        }
    }
}
