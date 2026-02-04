import { z } from "zod";
console.log("Zod compliance check:");
const schema = z.object({ foo: z.string() });
console.log("Has ~standard?", "~standard" in schema);
console.log("Schema keys:", Object.keys(schema));
