import { GoogleGenerativeAI } from "@google/generative-ai";

// Mock env for script
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "YOUR_KEY_HERE";

async function main() {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.error("Please set GOOGLE_GENERATIVE_AI_API_KEY env var");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const productName = "Acne Face Wash (with Parabens)";
    const avoidedIngredients = ["Methylparaben", "Propylparaben", "Sulfates"];

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

    console.log("Generating alternatives...");
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Raw Response:");
    console.log(text);

    // Test Link Construction
    try {
        const data = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        console.log("\nConstructed Links:");
        data.forEach((p: any) => {
            const query = encodeURIComponent(`${p.brand} ${p.productName}`);
            console.log(`- ${p.productName}`);
            console.log(`  Buy: https://www.google.com/search?tbm=shop&q=${query}`);
            // Placeholder Image based on generic terms
            console.log(`  Img: https://placehold.co/400x400?text=${encodeURIComponent(p.productName.substring(0, 20))}`);
        });
    } catch (e) {
        console.error("JSON Parse Error", e);
    }
}

main();
