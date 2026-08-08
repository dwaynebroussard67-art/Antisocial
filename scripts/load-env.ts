import { readFileSync } from "node:fs";

/**
 * Minimal .env.local loader, so scripts don't need `export DATABASE_URL=...`
 * typed by hand before every run.
 *
 * WHY THIS EXISTS: apply-schema.mjs already reads .env.local itself, but
 * scripts/seed.ts and scripts/seed-admin.ts did not — so seeding required
 * exporting the connection string into the shell first. That is a papercut
 * on a laptop and a genuine hazard on a phone: an exported credential sits
 * in shell history and in the environment of every later command in that
 * session, long after the script has finished.
 *
 * Deliberately NOT a dotenv dependency. This needs to read one file and set
 * a few keys; a package for that is more supply chain than the job is worth.
 *
 * Existing environment variables always win, so CI and Vercel — where the
 * value is injected properly and no .env.local exists — are unaffected.
 */
export function loadEnvLocal(path = ".env.local"): void {
  let contents: string;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return; // no file is fine — the value may already be in the environment
  }

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue; // never clobber

    let value = line.slice(eq + 1).trim();
    // Strip one layer of matching quotes. Connection strings routinely
    // contain characters that invite quoting, and a literal quote in a
    // password produces an auth failure that looks like a wrong password.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

/**
 * Load env, then fail loudly if the connection string still isn't there.
 * Better than letting `postgres(undefined!)` produce a confusing driver
 * error three frames deeper.
 */
export function requireDatabaseUrl(): string {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "No DATABASE_URL found.\n" +
        "  Put it in .env.local as:  DATABASE_URL=postgresql://...\n" +
        "  (.env.local is gitignored — never commit a connection string.)\n" +
        "  Use the SESSION pooler on port 5432, not the transaction pooler\n" +
        "  on 6543 — the latter breaks prepared statements and migrations\n" +
        "  fail silently."
    );
    process.exit(1);
  }
  return url;
}
