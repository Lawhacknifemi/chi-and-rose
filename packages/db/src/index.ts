import { env } from "@chi-and-rose/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import pg from "pg";

import * as schema from "./schema";

export * from "./schema";
export * from "drizzle-orm";

const { Pool } = pg;

// Use a Pool with explicit SSL settings to allow self-signed certs (DO requirement)
const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
