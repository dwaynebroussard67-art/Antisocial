import { db } from "@/db";
import { members } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(members).orderBy(asc(members.id));
  return Response.json({ members: rows });
}
