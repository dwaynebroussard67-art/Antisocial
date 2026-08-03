import { db } from "@/db";
import { nuraActions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { reverseAction } from "@/lib/nura/nura-service";
import type { Site } from "@/lib/nura/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site") as Site | null;
  const activeOnly = searchParams.get("active");

  const conditions = [];
  if (site) conditions.push(eq(nuraActions.site, site));
  if (activeOnly === "true") conditions.push(eq(nuraActions.active, true));

  const rows = await db
    .select()
    .from(nuraActions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(nuraActions.createdAt))
    .limit(200);

  return Response.json({ actions: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { actionId, reversedByMemberId } = body ?? {};
  if (!actionId || !reversedByMemberId) {
    return Response.json(
      { error: "actionId and reversedByMemberId are required" },
      { status: 400 },
    );
  }
  try {
    const updated = await reverseAction(Number(actionId), Number(reversedByMemberId));
    return Response.json({ action: updated });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
