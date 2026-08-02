import { db } from "@/db";
import { nuraConfig } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { setConfig } from "@/lib/nura/config";
import type { Site } from "@/lib/nura/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site") as Site | null;

  const rows = await db
    .select()
    .from(nuraConfig)
    .where(site ? eq(nuraConfig.site, site) : undefined)
    .orderBy(asc(nuraConfig.key));

  return Response.json({ config: rows });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { site, key, value } = body ?? {};
  if (!site || !key || value === undefined) {
    return Response.json({ error: "site, key, and value are required" }, { status: 400 });
  }
  await setConfig(site, key, value);
  return Response.json({ ok: true });
}
