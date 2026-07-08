import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Standard Postgres connection via Drizzle. Point DATABASE_URL at your
// Postgres instance (Supabase, Neon, Railway, RDS, whatever you use for
// Misfit Ministries already — reusing that instance with a new schema/
// prefix is simplest if it's already provisioned).
// prepare:false is required when DATABASE_URL points at Supabase's
// transaction pooler (port 6543) — the pooler doesn't support prepared
// statements. Harmless on a direct connection.
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client);
