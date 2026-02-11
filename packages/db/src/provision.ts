import { db } from "./index";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function provisionDatabase() {
  try {
    console.log("🛠️  Syncing database schema via Drizzle migrations...");

    // Path to the migrations folder relative to this file
    // In production, the file structure might be different if bundled, 
    // so we use a path that works for Bun's default layout.
    const migrationsFolder = path.join(__dirname, "migrations");

    console.log(`[DB] Looking for migrations in: ${migrationsFolder}`);

    await migrate(db, { migrationsFolder });

    console.log("✅ Database schema is up to date.");
  } catch (error) {
    console.error("❌ Error during database migration:", error);
    // Do NOT exit process, just log error. 
    // The server might still start if the error is non-fatal.
  }
}
