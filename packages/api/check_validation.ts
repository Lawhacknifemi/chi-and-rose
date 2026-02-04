import { z } from "zod";

const articleSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    summary: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    category: z.string().min(1),
    isPublished: z.boolean().default(false),
    publishedAt: z.string().optional(), // ISO String
});

const input = {
    title: "article kdkd",
    content: "lmlkamlmlamlamflamlaf",
    summary: "lkmldmlmala",
    imageUrl: "",
    category: "Nutrition",
    isPublished: false
    // publishedAt is missing
};

async function run() {
    const result = await articleSchema.safeParseAsync(input);
    if (!result.success) {
        console.log("Validation Failed!");
        console.log(JSON.stringify(result.error.format(), null, 2));
    } else {
        console.log("Validation Succeeded!");
    }
}

run();
