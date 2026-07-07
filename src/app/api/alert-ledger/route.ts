import { NextRequest, NextResponse } from "next/server";
import { requireSiteRole, requirePitAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { alertLedgerEntries } from "@/lib/db/schema/alert-ledger";
import { desc } from "drizzle-orm";
import { z } from "zod";

const createEntrySchema = z.object({
  incidentDate: z.string().datetime(),
  answered: z.enum(["unanswered", "answered"]),
  outcome: z.enum(["pending", "life_saved", "life_lost", "unable_to_locate", "false_alarm"]),
  approxArea: z.string().max(100).optional(),
  respondersNotifiedCount: z.number().int().min(0).optional(),
  respondersAffirmedCount: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

// GET: anyone with Pit access can see the board (that's the point — it's
// visible to the responders and the community in the Pit, not just staff).
export async function GET() {
  try {
    await requirePitAccess();
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.reason }, { status: 401 });
    }
    throw err;
  }

  const entries = await db
    .select()
    .from(alertLedgerEntries)
    .orderBy(desc(alertLedgerEntries.incidentDate))
    .limit(200);

  return NextResponse.json({ entries });
}

// POST: only staff (moderator/admin) can log a new entry — this is the
// manual-entry path you chose, not an automatic feed from Nura.
export async function POST(req: NextRequest) {
  let viewer;
  try {
    viewer = await requireSiteRole("moderator");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.reason }, { status: 403 });
    }
    throw err;
  }

  const parsed = createEntrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const [entry] = await db
    .insert(alertLedgerEntries)
    .values({
      ...parsed.data,
      incidentDate: new Date(parsed.data.incidentDate),
      loggedBy: viewer.id,
    })
    .returning();

  return NextResponse.json({ entry }, { status: 201 });
}
