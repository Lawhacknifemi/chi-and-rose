import { z } from "zod";

const profileSchema = z.object({
    conditions: z.array(z.string()),
    symptoms: z.array(z.string()),
    goals: z.array(z.string()),
    dietaryPreferences: z.array(z.string()),
    sensitivities: z.array(z.string()),
    dateOfBirth: z.string().or(z.date()).optional(),
});

const input = {
    goals: ["Improve nutrition"],
    dietaryPreferences: ["Pescatarian"],
    conditions: ["Eczema"],
    symptoms: [],
    sensitivities: ["Gluten"]
};

console.log("Testing validation...");
try {
    const result = profileSchema.parse(input);
    console.log("Validation success:", result);

    if ("~standard" in profileSchema) {
        console.log("Testing standard schema validation...");
        // @ts-ignore
        const stdResult = profileSchema["~standard"].validate(input);
        if (stdResult instanceof Promise) {
            stdResult.then(r => console.log("Std Result:", r)).catch(e => console.error("Std Promise Error:", e));
        } else {
            console.log("Std Result:", stdResult);
        }
    }
} catch (e) {
    console.error("Validation crashed:", e);
}
