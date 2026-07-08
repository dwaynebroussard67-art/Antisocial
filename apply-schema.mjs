// apply-schema.mjs — applies the generated ANTISOCIAL schema directly,
// bypassing drizzle-kit push (its introspection crashes on the existing
// Misfit tables in misfit-backend). Safe to run more than once: statements
// that already applied get skipped, never duplicated. Only CREATEs — it
// never drops or alters the existing Ministries tables.
//
// Usage:  node apply-schema.mjs
// Reads DATABASE_URL from .env.local by itself.

import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";

// --- read DATABASE_URL from .env.local (drizzle-kit couldn't; we can) ---
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const env = readFileSync(".env.local", "utf8");
    const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
    if (line) dbUrl = line.slice("DATABASE_URL=".length).trim();
  } catch {}
}
if (!dbUrl) {
  console.error("No DATABASE_URL found in environment or .env.local");
  process.exit(1);
}

const sqlFiles = readdirSync("./drizzle").filter((f) => f.endsWith(".sql")).sort();
if (sqlFiles.length === 0) {
  console.error("No .sql files found in ./drizzle");
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false, max: 1 });

// Errors that mean "already done" — skip, don't fail.
const ALREADY = new Set(["42P07", "42710", "42701", "42P06", "42P16"]);

let applied = 0;
let skipped = 0;
let failed = 0;

for (const file of sqlFiles) {
  console.log(`\n=== ${file} ===`);
  const contents = readFileSync(`./drizzle/${file}`, "utf8");
  const statements = contents
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    const label = stmt.replace(/\s+/g, " ").slice(0, 72);
    try {
      await sql.unsafe(stmt);
      applied++;
      console.log(`  OK    ${label}`);
    } catch (err) {
      if (ALREADY.has(err.code)) {
        skipped++;
        console.log(`  SKIP  (already exists) ${label}`);
      } else {
        failed++;
        console.log(`  FAIL  [${err.code}] ${err.message}`);
        console.log(`        ${label}`);
      }
    }
  }
}

await sql.end();
console.log(`\nDone. applied=${applied} skipped=${skipped} failed=${failed}`);
if (failed > 0) {
  console.log("Some statements failed — send Claude the FAIL lines above.");
  process.exit(1);
} else {
  console.log("Schema is live. Next: node --import tsx scripts/seed.ts  (or: npm run seed)");
}
