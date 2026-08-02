import { db } from "@/db";
import { chapelMessages, members } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { processNewChapelMessage } from "@/lib/nura/pipeline";
import type { Site } from "@/lib/nura/types";

export const dynamic = "force-dynamic";

function isSite(v: unknown): v is Site {
  return v === "antisocial" || v === "misfit";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site");
  if (!isSite(site)) {
    return Response.json({ error: "site must be 'antisocial' or 'misfit'" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: chapelMessages.id,
      site: chapelMessages.site,
      memberId: chapelMessages.memberId,
      threadId: chapelMessages.threadId,
      body: chapelMessages.body,
      isSystem: chapelMessages.isSystem,
      hidden: chapelMessages.hidden,
      createdAt: chapelMessages.createdAt,
      handle: members.handle,
      displayName: members.displayName,
    })
    .from(chapelMessages)
    .leftJoin(members, eq(chapelMessages.memberId, members.id))
    .where(and(eq(chapelMessages.site, site), eq(chapelMessages.hidden, false)))
    .orderBy(asc(chapelMessages.createdAt))
    .limit(200);

  return Response.json({ messages: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { site, memberId, text, threadId } = body ?? {};

  if (!isSite(site)) {
    return Response.json({ error: "site must be 'antisocial' or 'misfit'" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  if (memberId) {
    const [author] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (author?.banned) {
      return Response.json({ error: "This member's access has been revoked." }, { status: 403 });
    }
  }

  const [inserted] = await db
    .insert(chapelMessages)
    .values({
      site,
      memberId: memberId ?? null,
      threadId: threadId ?? null,
      body: text,
    })
    .returning();

  let outcome = null;
  try {
    outcome = await processNewChapelMessage({
      site,
      messageId: inserted.id,
      memberId: inserted.memberId,
      body: inserted.body,
      threadId: inserted.threadId,
    });
  } catch (err) {
    // Nura must never block the chat — a pipeline failure just means no
    // action was taken, the message still lands.
    console.error("Nura pipeline error", err);
  }

  return Response.json({ message: inserted, nura: outcome });
}
