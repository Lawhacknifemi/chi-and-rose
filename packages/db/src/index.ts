import { env } from "@chi-and-rose/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export * from "./schema";
export * from "drizzle-orm";

export const db = drizzle(env.DATABASE_URL, { schema });
