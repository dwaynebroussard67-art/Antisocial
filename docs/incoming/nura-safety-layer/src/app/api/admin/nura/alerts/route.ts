import { db } from "@/db";
import { alertLedgerEntries, members } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { answerAlert } from "@/lib/nura/nura-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: alertLedgerEntries.id,
      site: alertLedgerEntries.site,
      memberId: alertLedgerEntries.memberId,
      messageId: alertLedgerEntries.messageId,
      reason: alertLedgerEntries.reason,
      status: alertLedgerEntries.status,
      answeredBy: alertLedgerEntries.answeredBy,
      answeredAt: alertLedgerEntries.answeredAt,
      createdAt: alertLedgerEntries.createdAt,
      memberHandle: members.handle,
    })
    .from(alertLedgerEntries)
    .leftJoin(members, eq(alertLedgerEntries.memberId, members.id))
    .orderBy(desc(alertLedgerEntries.createdAt))
    .limit(100);

  return Response.json({ alerts: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { alertId, responderMemberId } = body ?? {};
  if (!alertId || !responderMemberId) {
    return Response.json(
      { error: "alertId and responderMemberId are required" },
      { status: 400 },
    );
  }
  const updated = await answerAlert(Number(alertId), Number(responderMemberId));
  return Response.json({ alert: updated });
}
