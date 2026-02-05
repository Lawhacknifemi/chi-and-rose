import { env } from "@chi-and-rose/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import pg from "pg";

import * as schema from "./schema";

console.log("[DB] Connecting to database:", env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Mask password

export * from "./schema";
export * from "drizzle-orm";
export * from "./provision";

const { Pool } = pg;

// Use a Pool with explicit SSL settings to allow self-signed certs (DO requirement)
const pool = new Pool({
    // DigitalOcean provides "sslmode=require" in the string, which overrides our config
    // and causes "SELF_SIGNED_CERT_IN_CHAIN" error. We strip it out to force our settings.
    connectionString: env.DATABASE_URL?.replace("?sslmode=require", "")?.replace("&sslmode=require", ""),
    ssl: env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
