import { db } from "@/db";
import { nuraLog } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { Site } from "@/lib/nura/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site") as Site | null;
  const flag = searchParams.get("flag");
  const stage = searchParams.get("stage");

  const conditions = [];
  if (site) conditions.push(eq(nuraLog.site, site));
  if (flag) conditions.push(eq(nuraLog.flag, flag));
  if (stage) conditions.push(eq(nuraLog.stage, stage));

  const rows = await db
    .select()
    .from(nuraLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(nuraLog.createdAt))
    .limit(300);

  return Response.json({ log: rows });
}
