import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Standard Postgres connection via Drizzle. Point DATABASE_URL at your
// Postgres instance (Supabase, Neon, Railway, RDS, whatever you use for
// Misfit Ministries already — reusing that instance with a new schema/
// prefix is simplest if it's already provisioned).
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);
